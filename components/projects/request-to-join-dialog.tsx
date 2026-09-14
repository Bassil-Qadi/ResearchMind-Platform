'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { useJoinRequestActions } from '@/hooks/useJoinRequests'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface RequestToJoinDialogProps {
  projectId: string
  openPositions: string[]
}

export function RequestToJoinDialog({ projectId, openPositions }: RequestToJoinDialogProps) {
  const [open, setOpen]         = useState(false)
  const [message, setMessage]   = useState('')
  const [position, setPosition] = useState<string>('')
  const [error, setError]       = useState<string | null>(null)
  const { request } = useJoinRequestActions(projectId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await request.mutateAsync({
        message:  message.trim() || undefined,
        position: position || undefined,
      })
      setOpen(false)
      setMessage('')
      setPosition('')
    } catch (err) {
      setError(errorMessage(err, 'Failed to send your request'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <UserPlus className="h-4 w-4" />
          Request to join
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request to join</DialogTitle>
          <DialogDescription>
            The project leads will review your request and decide whether to add you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {openPositions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="join-position">Position <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger id="join-position" className="rounded-xl">
                  <SelectValue placeholder="Which position are you interested in?" />
                </SelectTrigger>
                <SelectContent>
                  {openPositions.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="join-message">
              Message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="join-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe your background and why you'd like to join…"
              rows={4}
              maxLength={1000}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={request.isPending}>
              {request.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
              ) : (
                'Send request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
