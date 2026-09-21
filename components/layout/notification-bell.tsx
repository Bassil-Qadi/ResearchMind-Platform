'use client'

import { forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { useNotifications, type INotification } from '@/hooks/useNotifications'

import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  'project-invite': '🎉',
  'member-joined':  '👋',
  'member-left':    '👋',
  'task-assigned':  '✅',
  'task-moved':     '🔄',
  'new-message':    '💬',
  'join-request':   '🙋',
  'join-approved':  '🤝',
  'join-declined':  '🚫',
  'role-changed':   '⭐',
  'task-comment':   '🗨️',
}

/**
 * Takes a ref and passes its props through, so it can sit inside a Radix
 * `asChild` trigger (the header wraps it in a Tooltip). Without this, React
 * warned about the ref and the tooltip's handlers never reached the button.
 */
export const NotificationBell = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(function NotificationBell({ className, ...props }, ref) {
  const router = useRouter()
  const { data, markAllRead, markOneRead } = useNotifications()

  const notifications = data?.notifications ?? []
  const unreadCount   = data?.unreadCount   ?? 0

  async function handleClick(notification: INotification) {
    if (!notification.read) await markOneRead(notification._id)
    if (notification.link) router.push(notification.link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={ref}
        {...props}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none',
          className
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="font-display text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">All caught up</p>
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                  !n.read && 'bg-blue-500/5'
                )}
              >
                <span className="mt-0.5 text-base" aria-hidden>
                  {TYPE_ICONS[n.type] ?? '🔔'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', !n.read && 'font-medium')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
