'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Send } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { givenName } from '@/lib/names'
import { messageTime } from '@/lib/format-time'
import {
  useDirectThread, useSendDirectMessage,
  type DirectParticipant,
} from '@/hooks/useDirectMessages'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const formatTime = (value: string) => messageTime(value)

export function DirectChat({
  conversationId,
  participant,
}: {
  conversationId: string
  participant: DirectParticipant | null
}) {
  const { data: session } = useSession()
  const { data, isLoading } = useDirectThread(conversationId)
  const send = useSendDirectMessage(conversationId)

  const [content, setContent] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = useMemo(() => data?.messages ?? [], [data?.messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text) return

    setError(null)
    setContent('')

    try {
      await send.mutateAsync(text)
    } catch (err) {
      setContent(text) // give it back rather than losing what they typed
      setError(errorMessage(err, 'Failed to send'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        {participant && (
          <UserAvatar
            name={participant.name}
            src={participant.avatarUrl}
            className="h-9 w-9"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {participant?.name ?? 'Conversation'}
          </p>
          {participant && (
            <p className="truncate text-xs text-muted-foreground">
              {[participant.position, participant.department].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />
            ))
          ) : messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.senderId._id === session?.user?.id

              return (
                <div
                  key={message._id}
                  className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}
                >
                  {!mine && (
                    <UserAvatar
                      name={message.senderId.name}
                      src={message.senderId.avatarUrl}
                      className="mt-auto h-7 w-7"
                    />
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                      mine
                        ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={cn(
                        'mt-1 text-[10px]',
                        mine ? 'text-white/70' : 'text-muted-foreground'
                      )}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="border-t border-border/60 p-3">
        {error && (
          <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>
        )}
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Message ${givenName(participant?.name) ?? ''}…`}
            maxLength={5000}
            className="rounded-xl"
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={send.isPending || !content.trim()}
          >
            {send.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
