'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MessageSquare, Users } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { ProjectChat } from '@/components/messaging/project-chat'
import { DirectChat } from '@/components/messaging/direct-chat'
import { EmptyState } from '@/components/layout/empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConversations } from '@/hooks/useConversations'
import { useDirectConversations } from '@/hooks/useDirectMessages'
import { cn } from '@/lib/utils'

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7)  return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function initialsOf(title: string) {
  return title.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function MessagesView() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const deepLinked = searchParams.get('conversation')

  const { data: projectData, isLoading: projectsLoading } = useConversations()
  const { data: directData, isLoading: directLoading }    = useDirectConversations()

  const projects = projectData?.conversations ?? []
  const directs  = directData?.conversations ?? []

  // A notification links straight to a thread, so open that tab on arrival.
  const [tab, setTab] = useState<'projects' | 'direct'>(deepLinked ? 'direct' : 'projects')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedDirect, setSelectedDirect]   = useState<string | null>(deepLinked)

  useEffect(() => {
    if (deepLinked) {
      setTab('direct')
      setSelectedDirect(deepLinked)
    }
  }, [deepLinked])

  const activeProject = projects.find((c) => c.id === selectedProject) ?? projects[0] ?? null
  const activeDirect  = directs.find((c) => c.id === selectedDirect) ?? directs[0] ?? null

  const directUnread = directs.reduce((sum, c) => sum + c.unreadCount, 0)
  const loading = tab === 'projects' ? projectsLoading : directLoading

  return (
    <PageContainer className="!p-4 overflow-hidden">
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-elevated backdrop-blur-sm">

        {/* ── Sidebar ── */}
        <aside className="flex w-full flex-col border-r border-border/60 md:w-80 lg:w-96">
          <div className="border-b border-border/60 bg-muted/30 px-3 py-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'projects' | 'direct')}>
              <TabsList className="w-full">
                <TabsTrigger value="projects" className="flex-1 gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Projects
                </TabsTrigger>
                <TabsTrigger value="direct" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Direct
                  {directUnread > 0 && (
                    <Badge className="ml-1 h-4 min-w-4 rounded-full bg-violet-600 px-1 text-[10px]">
                      {directUnread > 9 ? '9+' : directUnread}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : tab === 'projects' ? (
              projects.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Join a project to start messaging</p>
                  <Link href="/projects" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                    Browse projects →
                  </Link>
                </div>
              ) : (
                <ul role="list">
                  {projects.map((conv, i) => {
                    const isActive = activeProject?.id === conv.id
                    const lastMsg = conv.lastMessage
                      ? `${conv.lastMessage.senderName === session?.user?.name ? 'You' : conv.lastMessage.senderName}: ${conv.lastMessage.content}`
                      : 'No messages yet'

                    return (
                      <li key={conv.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedProject(conv.id)}
                          className={cn(
                            'flex w-full items-start gap-3 border-b border-border/40 px-4 py-3.5 text-left transition-all duration-200 hover:bg-violet-500/5',
                            isActive && 'border-l-2 border-l-violet-500 bg-violet-500/10'
                          )}
                        >
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className={cn('bg-gradient-to-br text-xs font-semibold text-white', GRADIENTS[i % GRADIENTS.length])}>
                              {initialsOf(conv.title)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">{conv.title}</span>
                              {conv.lastMessage && (
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {formatTime(conv.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{lastMsg}</p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge className="h-5 min-w-5 shrink-0 rounded-full bg-violet-600 px-1.5 text-[10px]">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </Badge>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : directs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No direct messages yet</p>
                <Link href="/directory" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                  Find researchers →
                </Link>
              </div>
            ) : (
              <ul role="list">
                {directs.map((conv) => {
                  const isActive = activeDirect?.id === conv.id
                  const name = conv.with?.name ?? 'Unknown'
                  const preview = conv.lastMessage
                    ? `${conv.lastMessage.fromMe ? 'You: ' : ''}${conv.lastMessage.content}`
                    : 'No messages yet'

                  return (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDirect(conv.id)}
                        className={cn(
                          'flex w-full items-start gap-3 border-b border-border/40 px-4 py-3.5 text-left transition-all duration-200 hover:bg-violet-500/5',
                          isActive && 'border-l-2 border-l-violet-500 bg-violet-500/10'
                        )}
                      >
                        <UserAvatar
                          name={name}
                          src={conv.with?.avatarUrl}
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{name}</span>
                            {conv.lastMessage && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatTime(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{preview}</p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 min-w-5 shrink-0 rounded-full bg-violet-600 px-1.5 text-[10px]">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </Badge>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </aside>

        {/* ── Chat pane ── */}
        <div className="hidden flex-1 flex-col overflow-hidden md:flex">
          {tab === 'direct' ? (
            activeDirect ? (
              <DirectChat
                key={activeDirect.id}
                conversationId={activeDirect.id}
                participant={activeDirect.with}
              />
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No conversation selected"
                description="Pick someone from the list, or find a researcher in the directory to message."
                accent="violet"
                className="m-4 h-full border-none bg-transparent"
              />
            )
          ) : !activeProject ? (
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a project from the sidebar to view messages."
              accent="violet"
              className="m-4 h-full border-none bg-transparent"
            />
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn(
                      'bg-gradient-to-br text-xs font-semibold text-white',
                      GRADIENTS[projects.indexOf(activeProject) % GRADIENTS.length]
                    )}>
                      {initialsOf(activeProject.title)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{activeProject.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeProject.department} · {activeProject.members.length} member
                      {activeProject.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/projects/${activeProject.id}`}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View project →
                </Link>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                <ProjectChat projectId={activeProject.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageContainer className="!p-4"><Skeleton className="h-[70vh] rounded-2xl" /></PageContainer>}>
      <MessagesView />
    </Suspense>
  )
}
