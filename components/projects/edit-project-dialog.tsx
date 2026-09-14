'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Settings } from 'lucide-react'
import { apiFetch, errorMessage, ApiError } from '@/lib/api'
import { updateProjectSchema } from '@/lib/validations/project'
import type { ProjectDetail } from '@/hooks/useProject'
import { ChipInput } from '@/components/ui/chip-input'
import { DepartmentSelect } from '@/components/ui/department-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Status     = ProjectDetail['status']
type Visibility = 'public' | 'university' | 'private'

/** The date part of a stored timestamp, as a date input expects it. */
function toDateInput(value?: string): string {
  return value ? value.slice(0, 10) : ''
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

interface FormState {
  title:         string
  abstract:      string
  department:    string
  status:        Status
  visibility:    Visibility
  tags:          string[]
  openPositions: string[]
  startDate:     string
  endDate:       string
  fundingSource: string
  fundingAmount: string
}

function initialState(project: ProjectDetail): FormState {
  return {
    title:         project.title,
    abstract:      project.abstract,
    department:    project.department,
    status:        project.status,
    visibility:    project.visibility as Visibility,
    tags:          project.tags ?? [],
    openPositions: project.openPositions ?? [],
    startDate:     toDateInput(project.startDate),
    endDate:       toDateInput(project.endDate),
    fundingSource: project.fundingSource ?? '',
    fundingAmount: project.fundingAmount?.toString() ?? '',
  }
}

/**
 * Only what changed goes in the request. Sending the whole form would let two
 * co-PIs editing different fields quietly undo each other's work.
 */
function changedFields(project: ProjectDetail, form: FormState) {
  const original = initialState(project)
  const payload: Record<string, unknown> = {}

  for (const key of ['title', 'abstract', 'department', 'status', 'visibility', 'startDate'] as const) {
    if (form[key] !== original[key]) payload[key] = form[key]
  }
  if (!sameList(form.tags, original.tags)) payload.tags = form.tags
  if (!sameList(form.openPositions, original.openPositions)) {
    payload.openPositions = form.openPositions
  }

  // For the optional fields, emptying the input means "clear it", which the API
  // spells as null — leaving the key out would mean "leave it alone".
  if (form.endDate !== original.endDate) payload.endDate = form.endDate || null
  if (form.fundingSource.trim() !== original.fundingSource) {
    payload.fundingSource = form.fundingSource.trim() || null
  }
  if (form.fundingAmount !== original.fundingAmount) {
    payload.fundingAmount = form.fundingAmount === '' ? null : Number(form.fundingAmount)
  }

  return payload
}

type FieldErrors = Partial<Record<keyof FormState, string>>

export function EditProjectDialog({ project }: { project: ProjectDetail }) {
  const queryClient = useQueryClient()
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState<FormState>(() => initialState(project))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleOpenChange(next: boolean) {
    // Reopening starts from the project as it is now, not a stale draft.
    if (next) {
      setForm(initialState(project))
      setErrors({})
      setFormError(null)
    }
    setOpen(next)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const payload = changedFields(project, form)
    if (Object.keys(payload).length === 0) {
      setOpen(false)
      return
    }

    const local: FieldErrors = {}
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      local.endDate = 'End date is before the start date'
    }
    if (form.fundingAmount !== '' && !(Number(form.fundingAmount) > 0)) {
      local.fundingAmount = 'Enter an amount greater than zero'
    }

    // The same schema the server applies, so the messages match.
    const parsed = updateProjectSchema.safeParse(payload)
    if (!parsed.success) {
      for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) local[key as keyof FormState] = messages[0]
      }
    }
    if (Object.keys(local).length) {
      setErrors(local)
      return
    }

    setSaving(true)
    try {
      await apiFetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        body:   JSON.stringify(payload),
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', project._id] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ])
      setOpen(false)
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 403
          ? 'Only the PI or a co-PI can change this project.'
          : errorMessage(err, 'Could not save your changes')
      )
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (key: keyof FormState) =>
    errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Project settings</DialogTitle>
          <DialogDescription>
            Changes are visible to everyone who can see this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          {formError && (
            <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={form.title} onChange={(e) => set('title', e.target.value)} className="rounded-xl" />
            {fieldError('title')}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-abstract">Abstract</Label>
            <Textarea
              id="edit-abstract" rows={5} value={form.abstract}
              onChange={(e) => set('abstract', e.target.value)}
              className="resize-none rounded-xl"
            />
            <div className="flex justify-between">
              {fieldError('abstract') ?? <span />}
              <span className="text-xs text-muted-foreground">{form.abstract.trim().length}/5000</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as Status)}>
                <SelectTrigger id="edit-status" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="seeking">Recruiting</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-visibility">Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => set('visibility', v as Visibility)}>
                <SelectTrigger id="edit-visibility" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="university">University only</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.visibility === 'private' && project.visibility !== 'private' && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Private projects are hidden from everyone but members, and nobody new can ask to join.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-positions">Open positions</Label>
            <ChipInput
              id="edit-positions"
              value={form.openPositions}
              onChange={(v) => set('openPositions', v)}
              placeholder="e.g. PhD Student, then Enter"
            />
            <p className="text-xs text-muted-foreground">
              {form.status === 'seeking'
                ? 'People asking to join can say which of these they are applying for.'
                : 'Listed on the project. Set the status to Recruiting to invite applications.'}
            </p>
            {fieldError('openPositions')}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tags">Tags</Label>
            <ChipInput
              id="edit-tags"
              value={form.tags}
              onChange={(v) => set('tags', v)}
              placeholder="e.g. machine learning, then Enter"
              normalise={(s) => s.trim().toLowerCase()}
            />
            {fieldError('tags')}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-department">Department</Label>
            <DepartmentSelect id="edit-department" value={form.department} onChange={(v) => set('department', v)} />
            {fieldError('department')}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Start date</Label>
              <Input id="edit-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="rounded-xl" />
              {fieldError('startDate')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">End date <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="edit-end" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="rounded-xl" />
              {fieldError('endDate')}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-source">Funding source <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="edit-source" value={form.fundingSource} onChange={(e) => set('fundingSource', e.target.value)} placeholder="e.g. NSF Grant #123" className="rounded-xl" />
              {fieldError('fundingSource')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="edit-amount" type="number" min="0" step="any" value={form.fundingAmount} onChange={(e) => set('fundingAmount', e.target.value)} className="rounded-xl" />
              {fieldError('fundingAmount')}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
