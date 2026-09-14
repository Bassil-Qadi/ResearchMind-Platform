'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { apiFetch, errorMessage } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ROLE_STYLES, UNKNOWN_BADGE } from '@/lib/status-styles'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'

interface PendingUser {
  _id:        string
  name:       string
  email:      string
  role:       string
  department: string
  position?:  string
  createdAt:  string
}

export function PendingUsers() {
  const queryClient          = useQueryClient()
  const [acting, setActing]  = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ users: PendingUser[] }>({
    queryKey: ['admin-pending-users'],
    queryFn:  () => apiFetch('/api/admin/users?status=pending'),
    refetchInterval: 30_000,
  })

  const pending = data?.users ?? []

  async function handleDecision(userId: string, status: 'active' | 'rejected') {
    setActing(userId)
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      })
      queryClient.setQueryData(
        ['admin-pending-users'],
        (old: { users: PendingUser[] } | undefined) => ({
          users: (old?.users ?? []).filter((u) => u._id !== userId),
        })
      )
      // The same people appear in the user table and the headline stats. Left
      // alone, an approved account still read "pending" in the table below.
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (err) {
      alert(errorMessage(err, 'Failed to update this account'))
    } finally {
      setActing(null)
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending approvals
          {pending.length > 0 && (
            <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              {pending.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve new account registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-10 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500/50" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground">No pending registrations</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {pending.map((user) => (
              // Stacked on phones: side by side, the buttons left the name one letter wide.
              <li key={user._id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <Badge className={cn('rounded-full text-[10px]', ROLE_STYLES[user.role] ?? UNKNOWN_BADGE)}>
                      {user.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.department}
                    {user.position ? ` · ${user.position}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Registered {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="h-8 rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={acting === user._id}
                    onClick={() => handleDecision(user._id, 'active')}
                  >
                    {acting === user._id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <CheckCircle2 className="h-3 w-3" />
                    }
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg gap-1.5 text-destructive hover:text-destructive"
                    disabled={acting === user._id}
                    onClick={() => handleDecision(user._id, 'rejected')}
                  >
                    <XCircle className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}