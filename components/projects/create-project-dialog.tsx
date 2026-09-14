'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import type { z } from 'zod'
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project'
import { apiFetch, errorMessage } from '@/lib/api'
import { DepartmentSelect } from '@/components/ui/department-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

type CreateProjectFormValues = z.input<typeof createProjectSchema>

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
  useForm<CreateProjectFormValues, unknown, CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      status: 'active',
      visibility: 'university',
      tags: [],
      openPositions: [],
    },
  })

  async function onSubmit(data: CreateProjectInput) {
    setError(null)
    try {
      const project = await apiFetch<{ _id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      reset()
      router.push(`/projects/${project._id}`)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create project'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          Create project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">New research project</DialogTitle>
          <DialogDescription>
            Fill in the details to create your project and start collaborating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {error && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g. ML for Healthcare Diagnostics" className="rounded-xl" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="abstract">Abstract</Label>
            <Textarea id="abstract" {...register('abstract')} placeholder="Describe your research goals and methodology…" rows={4} className="rounded-xl resize-none" />
            {errors.abstract && <p className="text-xs text-destructive">{errors.abstract.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-status">Status</Label>
              <Select defaultValue="active" onValueChange={(v) => setValue('status', v as CreateProjectInput['status'])}>
                <SelectTrigger id="project-status" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="seeking">Seeking members</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-visibility">Visibility</Label>
              <Select defaultValue="university" onValueChange={(v) => setValue('visibility', v as CreateProjectInput['visibility'])}>
                <SelectTrigger id="project-visibility" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="university">University only</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <DepartmentSelect
              id="department"
              value={watch('department') ?? ''}
              onChange={(v) => setValue('department', v, { shouldValidate: true })}
            />
            {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register('startDate')} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fundingSource">Funding source <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="fundingSource" {...register('fundingSource')} placeholder="e.g. NSF Grant #123" className="rounded-xl" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : 'Create project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}