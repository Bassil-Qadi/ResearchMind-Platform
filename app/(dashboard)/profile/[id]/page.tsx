'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Building2, BookOpen, FolderKanban,
  Globe, Mail, ExternalLink,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { MessageUserButton } from '@/components/messaging/message-user-button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/layout/empty-state'
import { useUserProfile } from '@/hooks/useUserProfile'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_STYLES as STATUS_STYLES } from '@/lib/status-styles'

export default function ProfilePage() {
  const { id }             = useParams<{ id: string }>()
  const { data: session }  = useSession()
  const isMe               = id === 'me' || id === session?.user?.id
  const { data, isLoading, isError } = useUserProfile(id)

  if (isLoading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageContainer>
    )
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg font-semibold">Profile not found</p>
          <p className="mt-1 text-sm text-muted-foreground">This profile may be private or doesn&apos;t exist.</p>
          <Button asChild className="mt-6 rounded-xl" variant="outline">
            <Link href="/directory">Back to directory</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  const { user, projects } = data

  return (
    <PageContainer className="space-y-6">
      {/* Profile header */}
      <div className="animate-fade-up overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="relative h-28 bg-gradient-to-r from-rose-500 via-violet-600 to-blue-600 md:h-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="mesh-bg absolute inset-0 opacity-30" aria-hidden />
        </div>
        <div className="relative px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <UserAvatar
                name={user.name}
                src={user.avatarUrl}
                className="-mt-12 h-24 w-24 border-4 border-card shadow-lg md:-mt-14 md:h-28 md:w-28"
                fallbackClassName="from-rose-500 to-violet-600 text-2xl font-bold"
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    {user.name}
                  </h1>
                  <Badge className="rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                    {user.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {user.position && user.department
                    ? `${user.position} · ${user.department}`
                    : user.position ?? user.department ?? 'No position set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isMe && <MessageUserButton userId={user._id} />}
              {isMe && <EditProfileDialog user={user} />}
            </div>
          </div>

          {isMe && (
            <div className="mt-6 border-t border-border/60 pt-6">
              <AvatarUpload name={user.name} avatarUrl={user.avatarUrl} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {user.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
            )}
            {user.department && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {user.department}
              </span>
            )}
            {user.orcidId && (
              <a
                href={`https://orcid.org/${user.orcidId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                ORCID: {user.orcidId}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {user.publicationsUrl && (
              <a
                href={user.publicationsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Publications
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="about" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="projects">
            Projects {projects.length > 0 && `(${projects.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-base">About</CardTitle>
              <CardDescription>Biography and research interests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {user.bio ?? (isMe
                  ? 'Add a bio to help collaborators discover your expertise.'
                  : 'No bio added yet.')}
              </p>
              {user.researchInterests?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Research interests</p>
                  <div className="flex flex-wrap gap-2">
                    {user.researchInterests.map((interest: string) => (
                      <Badge key={interest} variant="secondary" className="rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {isMe && !user.bio && (
                <EditProfileDialog user={user} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Projects this researcher is involved in will appear here."
              accent="blue"
              action={isMe ? (
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/projects">Browse projects</Link>
                </Button>
              ) : undefined}
              className="border-solid bg-card"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <Link key={project._id} href={`/projects/${project._id}`}>
                  <Card className="card-interactive h-full border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="font-display text-sm">{project.title}</CardTitle>
                        <Badge className={cn('shrink-0 rounded-full text-xs', STATUS_STYLES[project.status])}>
                          {project.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">{project.abstract}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{project.department}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
