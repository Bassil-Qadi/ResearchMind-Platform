'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Ban, Check, Loader2, RotateCcw, Search, X } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useAdminUsers, useUpdateAdminUser,
  type AdminUser, type AdminUserFilters,
} from '@/hooks/useAdminUsers'
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from '@/types'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ROLE_STYLES, USER_STATUS_STYLES as STATUS_STYLES,
} from '@/lib/status-styles'

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useUpdateAdminUser()
  const [error, setError] = useState<string | null>(null)

  async function apply(changes: { status?: UserStatus; role?: UserRole }, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return

    setError(null)
    try {
      await update.mutateAsync({ userId: user._id, ...changes })
    } catch (err) {
      setError(errorMessage(err, 'Could not update this account'))
    }
  }

  const busy = update.isPending

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={user.name} src={user.avatarUrl} className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/profile/${user._id}`} className="truncate text-sm font-medium hover:underline">
              {user.name}
            </Link>
            {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
            <Badge className={cn('rounded-full text-[10px]', STATUS_STYLES[user.status] ?? 'bg-muted')}>
              {user.status}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
            {user.department ? ` · ${user.department}` : ''}
          </p>
          {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {/* An admin cannot change their own role or status: that is how you
            lock yourself out, and the server refuses it anyway. */}
        {isSelf ? (
          <Badge className={cn('rounded-full text-[10px]', ROLE_STYLES[user.role] ?? 'bg-muted')}>
            {user.role}
          </Badge>
        ) : (
          <>
            <Select
              value={user.role}
              disabled={busy}
              onValueChange={(v) =>
                apply({ role: v as UserRole }, `Change ${user.name}'s role to ${v}?`)
              }
            >
              {/* No visible label, and every row has one, so name it per user. */}
              <SelectTrigger aria-label={`Role for ${user.name}`} className="h-8 w-32 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {user.status === 'pending' && (
              <>
                <Button
                  size="sm" className="h-8 gap-1.5 rounded-lg text-xs"
                  disabled={busy} onClick={() => apply({ status: 'active' })}
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
                  disabled={busy} onClick={() => apply({ status: 'rejected' })}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}

            {user.status === 'active' && (
              <Button
                size="sm" variant="outline"
                className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() =>
                  apply(
                    { status: 'suspended' },
                    `Suspend ${user.name}? They will be signed out and unable to sign back in.`
                  )
                }
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                Suspend
              </Button>
            )}

            {(user.status === 'suspended' || user.status === 'rejected') && (
              <Button
                size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs"
                disabled={busy} onClick={() => apply({ status: 'active' })}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Reinstate
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  )
}

export function UserManagement() {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminUserFilters['status']>('all')
  const [role, setRole]     = useState<AdminUserFilters['role']>('all')
  const [page, setPage]     = useState(1)

  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isError } = useAdminUsers({
    q: debouncedSearch || undefined,
    status,
    role,
    page,
  })

  const users = data?.users ?? []
  const total = data?.pagination.total ?? 0
  const pages = data?.pagination.pages ?? 1

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-base">User management</CardTitle>
        <CardDescription>
          Approve, suspend and set roles for everyone on the platform
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, email, department or university ID…"
              className="rounded-xl pl-9"
              aria-label="Search users"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => { setStatus(v as AdminUserFilters['status']); setPage(1) }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {USER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}{data?.counts?.[s] !== undefined ? ` (${data.counts[s]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={role}
            onValueChange={(v) => { setRole(v as AdminUserFilters['role']); setPage(1) }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-36" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {USER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Could not load users.
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No users match those filters.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {users.map((user) => (
                <UserRow
                  key={user._id}
                  user={user}
                  isSelf={user._id === session?.user?.id}
                />
              ))}
            </ul>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {total} user{total !== 1 ? 's' : ''}
                {pages > 1 ? ` · page ${page} of ${pages}` : ''}
              </p>
              {pages > 1 && (
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline" className="h-8 rounded-lg text-xs"
                    disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-8 rounded-lg text-xs"
                    disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
