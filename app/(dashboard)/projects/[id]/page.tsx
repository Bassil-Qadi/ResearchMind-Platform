'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CheckCircle2,
  Building2, Calendar, Users, Tag, MessageSquare
} from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { InviteMemberDialog } from '@/components/projects/invite-member-dialog'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { RequestToJoinDialog } from '@/components/projects/request-to-join-dialog'
import { JoinRequestsPanel } from '@/components/projects/join-requests-panel'
import { ProjectFiles } from '@/components/projects/project-files'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/layout/empty-state'
import { useProject } from '@/hooks/useProject'
import {
  useJoinRequests, useMyJoinRequest,
  useJoinRequestActions, useTransferPi,
} from '@/hooks/useJoinRequests'
import { apiFetch, errorMessage } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { initialsOf } from '@/lib/names'
import {
  PROJECT_STATUS_LABELS as STATUS_LABELS,
  PROJECT_STATUS_STYLES as STATUS_STYLES,
} from '@/lib/status-styles'
import { ProjectChat } from '@/components/messaging/project-chat'
import { KanbanBoard } from '@/components/tasks/kanban-board'

const ROLE_LABELS: Record<string, string> = {
  'pi': 'Principal Investigator',
  'co-pi': 'Co-PI',
  'contributor': 'Contributor',
  'observer': 'Observer',
}

const ROLE_GRADIENTS: Record<string, string> = {
  'pi': 'from-violet-500 to-purple-600',
  'co-pi': 'from-blue-500 to-indigo-600',
  'contributor': 'from-teal-500 to-emerald-600',
  'observer': 'from-slate-400 to-slate-500',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  // A comment notification links here with ?task=, so land on that task.
  const linkedTaskId = useSearchParams().get('task')
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: project, isLoading, isError } = useProject(id)

  // Derive permissions
  const myMembership = project?.members.find(
    (m) => m.userId._id === session?.user?.id
  )
  const isMember  = !!myMembership
  const canManage = ['pi', 'co-pi'].includes(myMembership?.role ?? '')
  const isPi      = myMembership?.role === 'pi'

  // Shares a cache key with the panel below, so this costs no extra request.
  const { data: requestQueue } = useJoinRequests(id, canManage)
  const pendingCount = requestQueue?.requests.length ?? 0

  const { data: myRequestData } = useMyJoinRequest(id, !!project && !isMember)
  const myRequest = myRequestData?.request ?? null

  const { withdraw } = useJoinRequestActions(id)
  const transferPi   = useTransferPi(id)

  // Matches what the API will accept, so the button never lies.
  const canRequestToJoin =
    !!project && !isMember && project.visibility !== 'private' && project.status !== 'completed'

  async function handleWithdraw() {
    if (!myRequest) return
    try {
      await withdraw.mutateAsync(myRequest._id)
    } catch (err) {
      alert(errorMessage(err, 'Failed to withdraw your request'))
    }
  }

  async function handleTransferPi(userId: string, name: string) {
    if (!confirm(`Make ${name} the PI? You will become a co-PI.`)) return
    try {
      await transferPi.mutateAsync(userId)
    } catch (err) {
      alert(errorMessage(err, 'Failed to transfer the PI role'))
    }
  }

  async function handleLeave() {
    if (!confirm('Leave this project?')) return
    try {
      await apiFetch(`/api/projects/${id}/members?userId=${session?.user?.id}`, {
        method: 'DELETE',
      })
      await queryClient.invalidateQueries({ queryKey: ['project', id] })
      router.push('/projects')
    } catch (err) {
      alert(errorMessage(err, 'Failed to delete this project'))
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-6 w-1/3 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageContainer>
    )
  }

  // Error / not found
  if (isError || !project) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg font-semibold">Project not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted or you don&apos;t have access.
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => router.push('/projects')}>
            Back to projects
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={project.title}
        description={project.department}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.title },
        ]}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <>
                <InviteMemberDialog projectId={id} />
                <EditProjectDialog project={project} />
              </>
            )}
            {isMember && !isPi && (
              <Button variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={handleLeave}>
                Leave project
              </Button>
            )}
            {canRequestToJoin && (
              myRequest ? (
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Request pending
                  </Badge>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={withdraw.isPending}
                    onClick={handleWithdraw}
                  >
                    Withdraw
                  </Button>
                </div>
              ) : (
                <RequestToJoinDialog projectId={id} openPositions={project.openPositions} />
              )
            )}
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn('rounded-full', STATUS_STYLES[project.status])}>
          {STATUS_LABELS[project.status] ?? project.status}
        </Badge>
        {project.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="rounded-full">
            {tag}
          </Badge>
        ))}
        {project.fundingSource && (
          <span className="text-sm text-muted-foreground">· {project.fundingSource}</span>
        )}
      </div>

      <Tabs defaultValue={linkedTaskId ? 'tasks' : 'overview'} className="space-y-6">
        {/* Six tabs do not fit a phone: scroll the row rather than cut off Files and Requests. */}
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">
            Team ({project.members.length})
          </TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {isMember && <TabsTrigger value="files">Files</TabsTrigger>}
          {canManage && (
            <TabsTrigger value="requests">
              Requests{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-base">Abstract</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* break-words, not break-all: break-all split ordinary words ("Ra mtha")
                    to wrap them; this only breaks a word too long for the line. */}
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
                  {project.abstract}
                </p>

                {project.openPositions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" /> Open positions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.openPositions.map((pos) => (
                        <Badge key={pos} className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          {pos}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {project.department}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    Started {new Date(project.startDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar info */}
            <div className="space-y-4">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Principal Investigator</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const pi = project.members.find((m) => m.role === 'pi')
                    if (!pi) return <p className="text-sm text-muted-foreground">Not assigned</p>
                    const initials = initialsOf(pi.userId.name)
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{pi.userId.name}</p>
                          <p className="text-xs text-muted-foreground">{pi.userId.position ?? pi.userId.department ?? ''}</p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {project.tags.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Team ── */}
        <TabsContent value="team">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-base">Team members</CardTitle>
              <CardDescription>Researchers collaborating on this project</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60">
                {project.members.map((member) => {
                  const isCurrentUser = member.userId._id === session?.user?.id
                  return (
                    <li key={member.userId._id} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={member.userId.name}
                          src={member.userId.avatarUrl}
                          className="h-10 w-10"
                          fallbackClassName={ROLE_GRADIENTS[member.role]}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {member.userId.name}
                            {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_LABELS[member.role]} {member.userId.position ? `· ${member.userId.position}` : ''}
                          </p>
                        </div>
                      </div>
                      {/* PI can hand over the role, and remove non-PI members */}
                      {isPi && member.role !== 'pi' && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                            disabled={transferPi.isPending}
                            onClick={() => handleTransferPi(member.userId._id, member.userId.name)}
                          >
                            Make PI
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg text-xs text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              if (!confirm(`Remove ${member.userId.name}?`)) return
                              try {
                                await apiFetch(`/api/projects/${id}/members?userId=${member.userId._id}`, { method: 'DELETE' })
                                queryClient.invalidateQueries({ queryKey: ['project', id] })
                              } catch (err) { alert(errorMessage(err, 'Failed to remove this member')) }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Files ── */}
        {isMember && (
          <TabsContent value="files">
            <ProjectFiles projectId={id} isMember={isMember} canManage={canManage} />
          </TabsContent>
        )}

        {/* ── Join requests ── */}
        {canManage && (
          <TabsContent value="requests">
            <JoinRequestsPanel projectId={id} canReview={canManage} />
          </TabsContent>
        )}

        {/* Discission */}
        <TabsContent value="discussion">
          {isMember ? (
            <ProjectChat projectId={id} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Members only"
              description="Join this project to participate in the discussion."
              accent="violet"
            />
          )}
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          {isMember ? (
            <KanbanBoard
              projectId={id}
              initialTaskId={linkedTaskId}
              members={project.members.map((m) => ({
                _id:  m.userId._id,
                name: m.userId.name,
              }))}
            />
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Members only"
              description="Join this project to view and manage tasks."
              accent="blue"
            />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
