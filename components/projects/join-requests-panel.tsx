'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, UserPlus, X } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import {
  useJoinRequests, useJoinRequestActions,
  type JoinRequest, type MemberRole,
} from '@/hooks/useJoinRequests'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/layout/empty-state'

function RequestRow({
  projectId,
  request,
}: {
  projectId: string
  request: JoinRequest
}) {
  const [role, setRole]   = useState<MemberRole>('contributor')
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<'approve' | 'decline' | null>(null)
  const { review } = useJoinRequestActions(projectId)

  async function act(kind: 'approve' | 'decline') {
    setError(null)
    setActing(kind)
    try {
      await review.mutateAsync(
        kind === 'approve'
          ? { requestId: request._id, status: 'approved', role }
          : { requestId: request._id, status: 'declined' }
      )
    } catch (err) {
      setError(errorMessage(err, `Failed to ${kind} this request`))
    } finally {
      setActing(null)
    }
  }

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={request.userId.name}
          src={request.userId.avatarUrl}
          className="h-10 w-10"
        />

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${request.userId._id}`}
            className="text-sm font-medium hover:underline"
          >
            {request.userId.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {[request.userId.position, request.userId.department].filter(Boolean).join(' · ')}
          </p>

          {request.position && (
            <Badge variant="secondary" className="mt-2 rounded-full text-xs">
              Applying for: {request.position}
            </Badge>
          )}

          {request.message && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {request.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
          {/* No visible label here, and several rows can be open at once, so
              name each one after its applicant. */}
          <SelectTrigger
            aria-label={`Role for ${request.userId.name}`}
            className="h-8 w-40 rounded-lg text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contributor">Contributor</SelectItem>
            <SelectItem value="co-pi">Co-PI</SelectItem>
            <SelectItem value="observer">Observer</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
          disabled={acting !== null}
          onClick={() => act('decline')}
        >
          {acting === 'decline'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <X className="h-3.5 w-3.5" />}
          Decline
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs"
          disabled={acting !== null}
          onClick={() => act('approve')}
        >
          {acting === 'approve'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Check className="h-3.5 w-3.5" />}
          Approve
        </Button>
      </div>
    </li>
  )
}

export function JoinRequestsPanel({
  projectId,
  canReview,
}: {
  projectId: string
  canReview: boolean
}) {
  const { data, isLoading } = useJoinRequests(projectId, canReview)
  const requests = data?.requests ?? []

  if (!canReview) return null

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-display text-base">Join requests</CardTitle>
        <CardDescription>
          Researchers asking to join this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No pending requests"
            description="When someone asks to join this project, they'll show up here for review."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {requests.map((request) => (
              <RequestRow key={request._id} projectId={projectId} request={request} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
