"use client";

import { useEffect, useState } from "react";

import { Plus, Loader2, Calendar, MessageSquare, X } from "lucide-react";
import {
  useProjectTasks,
  COLUMNS,
  type ITask,
  type TaskStatus,
  type TaskPriority,
} from "@/hooks/useProjectTasks";
import { apiFetch, errorMessage } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/10   text-red-600   dark:text-red-400",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-red-500",
};

// ── Task card ──────────────────────────────────────────────
function TaskCard({
  task,
  projectId,
  onMove,
  onOpen,
}: {
  task: ITask;
  projectId: string;
  onMove: (taskId: string, status: TaskStatus) => void;
  onOpen: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation(); // the card itself opens the task
    const discussion = task.commentCount
      ? ` and its ${task.commentCount} comment${task.commentCount === 1 ? "" : "s"}`
      : "";
    if (!confirm(`Delete "${task.title}"${discussion}?`)) return;

    setDeleting(true);
    try {
      await apiFetch(`/api/projects/${projectId}/tasks/${task._id}`, {
        method: "DELETE",
      });
      queryClient.setQueryData(
        ["tasks", projectId],
        (old: { tasks: ITask[] } | undefined) => ({
          tasks: (old?.tasks ?? []).filter((t) => t._id !== task._id),
        }),
      );
    } catch (err) {
      // It used to fail silently and leave the card where it was.
      alert(errorMessage(err, "Could not delete this task"));
    } finally {
      setDeleting(false);
    }
  }

  const otherStatuses = COLUMNS.map((c) => c.id).filter(
    (s) => s !== task.status,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task._id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(task._id);
        }
      }}
      aria-label={`Open task: ${task.title}`}
      className="group relative cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        aria-label="Delete task"
        disabled={deleting}
        className="absolute right-2 top-2 hidden rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:flex group-hover:opacity-100"
      >
        {deleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </button>

      {/* Title */}
      <p className="pr-5 text-sm font-medium leading-snug">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "rounded-full text-[10px] gap-1",
            PRIORITY_STYLES[task.priority],
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              PRIORITY_DOT[task.priority],
            )}
          />
          {task.priority}
        </Badge>

        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}

        {(task.commentCount ?? 0) > 0 && (
          <span
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
            aria-label={`${task.commentCount} comments`}
          >
            <MessageSquare className="h-3 w-3" />
            {task.commentCount}
          </span>
        )}

        {task.assigneeId && (
          <UserAvatar
            name={task.assigneeId.name}
            src={task.assigneeId.avatarUrl}
            className="ml-auto h-5 w-5"
            fallbackClassName="text-[8px]"
          />
        )}
      </div>

      {/* Move to column */}
      <div className="mt-2 hidden flex-wrap gap-1 group-hover:flex">
  {otherStatuses.map((s) => (
    <button
      key={s}
      onClick={(e) => { e.stopPropagation(); onMove(task._id, s); }}
      className="rounded-lg border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      → {COLUMNS.find((c) => c.id === s)?.label}
    </button>
  ))}
</div>
    </div>
  );
}

// ── Create task dialog ──────────────────────────────────────
function CreateTaskDialog({
  projectId,
  defaultStatus,
  members,
}: {
  projectId: string;
  defaultStatus: TaskStatus;
  members: { _id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newTask = await apiFetch<ITask>(
        `/api/projects/${projectId}/tasks`,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: desc.trim() || undefined,
            priority,
            status,
            assigneeId:
              assignee && assignee !== "unassigned" ? assignee : undefined,
            dueDate: dueDate || undefined,
          }),
        },
      );

      // Update cache directly — don't wait for socket
      queryClient.setQueryData(
        ["tasks", projectId],
        (old: { tasks: ITask[] } | undefined) => ({
          tasks: [...(old?.tasks ?? []), newTask],
        }),
      );

      setTitle("");
      setDesc("");
      setPriority("medium");
      setAssignee("");
      setDueDate("");
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New task</DialogTitle>\
          <DialogDescription>
    Add a task to this project column and optionally assign it to a team member.
  </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            {/* "new-task-" ids keep these apart from the edit form's "task-" ones. */}
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-task-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="new-task-description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Add more detail…"
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-task-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
              >
                <SelectTrigger id="new-task-status" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-task-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger id="new-task-priority" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-task-assignee">
                Assignee{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="new-task-assignee" className="rounded-xl">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-task-due">
                Due date{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              onClick={handleCreate}
              disabled={!title.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create task"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main board ─────────────────────────────────────────────
export function KanbanBoard({
  projectId,
  members,
  initialTaskId,
}: {
  projectId: string;
  members: { _id: string; name: string }[];
  /** Opened on arrival — a comment notification links straight to its task. */
  initialTaskId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useProjectTasks(projectId);
  const tasks = data?.tasks ?? [];

  const [openTaskId, setOpenTaskId] = useState<string | null>(initialTaskId ?? null);
  useEffect(() => {
    if (initialTaskId) setOpenTaskId(initialTaskId);
  }, [initialTaskId]);

  // Read from the live list, so the dialog reflects moves and edits made by
  // others — and closes by itself if the task is deleted while it is open.
  const openTask = tasks.find((t) => t._id === openTaskId) ?? null;

  async function handleMove(taskId: string, newStatus: TaskStatus) {
    // Optimistic update
    queryClient.setQueryData(
      ["tasks", projectId],
      (old: { tasks: ITask[] } | undefined) => ({
        tasks: (old?.tasks ?? []).map((t) =>
          t._id === taskId ? { ...t, status: newStatus } : t,
        ),
      }),
    );
    try {
      await apiFetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <Skeleton key={col.id} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <>
    <TaskDetailDialog
      task={openTask}
      projectId={projectId}
      members={members}
      open={!!openTask}
      onOpenChange={(open) => { if (!open) setOpenTaskId(null); }}
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks
          .filter((t) => t.status === col.id)
          .sort((a, b) => a.order - b.order);

        return (
          <div key={col.id} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", col.color)} />
              <span className="text-sm font-medium">{col.label}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-muted/30 p-2 min-h-[200px]">
              {colTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  projectId={projectId}
                  onMove={handleMove}
                  onOpen={setOpenTaskId}
                />
              ))}
              <CreateTaskDialog
                projectId={projectId}
                defaultStatus={col.id}
                members={members}
              />
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
