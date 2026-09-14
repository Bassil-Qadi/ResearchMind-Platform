'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { apiFetch, errorMessage } from '@/lib/api'
import { COLUMNS, type ITask } from '@/hooks/useProjectTasks'
import { TASK_PRIORITIES, updateTaskSchema } from '@/lib/validations/task'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const UNASSIGNED = 'unassigned'

interface FormState {
  title:       string
  description: string
  status:      ITask['status']
  priority:    ITask['priority']
  assigneeId:  string
  dueDate:     string
}

function initialState(task: ITask): FormState {
  return {
    title:       task.title,
    description: task.description ?? '',
    status:      task.status,
    priority:    task.priority,
    assigneeId:  task.assigneeId?._id ?? UNASSIGNED,
    dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
  }
}

/** Only what changed, so two people editing different fields do not collide. */
function changedFields(task: ITask, form: FormState) {
  const original = initialState(task)
  const payload: Record<string, unknown> = {}

  if (form.title !== original.title)       payload.title = form.title
  if (form.status !== original.status)     payload.status = form.status
  if (form.priority !== original.priority) payload.priority = form.priority

  // Emptying these means "clear it", which the API spells as null.
  if (form.description.trim() !== original.description.trim()) {
    payload.description = form.description.trim() || null
  }
  if (form.assigneeId !== original.assigneeId) {
    payload.assigneeId = form.assigneeId === UNASSIGNED ? null : form.assigneeId
  }
  if (form.dueDate !== original.dueDate) {
    payload.dueDate = form.dueDate || null
  }

  return payload
}

export function TaskEditForm({
  task, projectId, members, onDone,
}: {
  task:      ITask
  projectId: string
  members:   { _id: string; name: string }[]
  onDone:    () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm]   = useState<FormState>(() => initialState(task))
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'title') setTitleError(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload = changedFields(task, form)
    if (Object.keys(payload).length === 0) {
      onDone()
      return
    }

    // The same schema the server applies, so the messages match.
    const parsed = updateTaskSchema.safeParse(payload)
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors
      setTitleError(fields.title?.[0] ?? null)
      setError(fields.title?.[0] ? null : 'Some of those values are not valid.')
      return
    }

    setSaving(true)
    try {
      await apiFetch(`/api/projects/${projectId}/tasks/${task._id}`, {
        method: 'PATCH',
        body:   JSON.stringify(payload),
      })
      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not save your changes'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="rounded-xl"
          autoFocus
        />
        {titleError && <p className="text-xs text-destructive">{titleError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What needs doing?"
          maxLength={2000}
          className="resize-none rounded-xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="task-status">Column</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as ITask['status'])}>
            <SelectTrigger id="task-status" className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-priority">Priority</Label>
          <Select value={form.priority} onValueChange={(v) => set('priority', v as ITask['priority'])}>
            <SelectTrigger id="task-priority" className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="task-assignee">Assignee</Label>
          {/* Only project members: the server refuses anyone else. */}
          <Select value={form.assigneeId} onValueChange={(v) => set('assigneeId', v)}>
            <SelectTrigger id="task-assignee" className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-due">Due date</Label>
          <Input
            id="task-due"
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="rounded-xl" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save task'}
        </Button>
      </div>
    </form>
  )
}
