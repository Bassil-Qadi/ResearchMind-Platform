'use client'

import Link from 'next/link'
import {
  Users, FolderKanban, MessageSquare,
  CheckSquare, TrendingUp, Shield,
  UserCog, Clock,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/layout/stat-card'
import { useAdminStats } from '@/hooks/useAdminStats'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PendingUsers } from '@/components/admin/pending-users'
import { UserManagement } from '@/components/admin/user-management'
import {
  PROJECT_STATUS_LABELS as STATUS_LABELS,
  PROJECT_STATUS_STYLES as STATUS_STYLES, ROLE_STYLES,
} from '@/lib/status-styles'

const DEPT_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-green-500',
]

export default function AdminPage() {
  const { data, isLoading, isError } = useAdminStats()

  if (isError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Shield className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-display font-semibold">Access denied</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need admin privileges to view this page.
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Administration"
        description="Platform analytics, user management, and moderation tools."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' },
        ]}
      />

      {/* Overview stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total users"
            value={data!.overview.totalUsers}
            // The trend already carries the number; repeating it as the
            // description printed "+4 this month" twice. Both counts cover the
            // last 30 days, so they say so rather than "this month".
            description="joined in 30 days"
            icon={Users}
            accent="directory"
            trend={{ value: `+${data!.overview.newUsersThisMonth}`, direction: 'up' }}
          />
          <StatCard
            title="Total projects"
            value={data!.overview.totalProjects}
            description={`${data!.overview.activeProjects} active · ${data!.overview.seekingProjects} recruiting`}
            icon={FolderKanban}
            accent="projects"
          />
          <StatCard
            title="Messages sent"
            value={data!.overview.totalMessages}
            description="sent in 30 days"
            icon={MessageSquare}
            accent="messages"
            trend={{ value: `+${data!.overview.messagesThisMonth}`, direction: 'up' }}
          />
          <StatCard
            title="Tasks completed"
            value={data!.overview.completedTasks}
            description={`of ${data!.overview.totalTasks} total tasks`}
            icon={CheckSquare}
            accent="dashboard"
          />
        </div>
      )}

      {/* Pending users */}
      <PendingUsers />

      {/* Everyone else */}
      <UserManagement />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Users by role */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Users by role
            </CardTitle>
            <CardDescription>Breakdown of user types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {data!.charts.usersByRole.map(({ _id, count }) => {
                  const pct = Math.round((count / data!.overview.totalUsers) * 100)
                  return (
                    <li key={_id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{_id}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Projects by status */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Projects by status
            </CardTitle>
            <CardDescription>Current project breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {data!.charts.projectsByStatus.map(({ _id, count }) => (
                  <li key={_id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
                    <Badge className={cn('rounded-full', STATUS_STYLES[_id] ?? 'bg-muted')}>
                      {STATUS_LABELS[_id] ?? _id}
                    </Badge>
                    <span className="font-display text-lg font-bold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Projects by department */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4" /> Top departments
            </CardTitle>
            <CardDescription>Most active research departments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {data!.charts.projectsByDepartment.map(({ _id, count }, i) => (
                  <li key={_id} className="flex items-center gap-3">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DEPT_COLORS[i] ?? 'bg-slate-400')} />
                    <span className="min-w-0 flex-1 truncate text-sm">{_id || 'Unknown'}</span>
                    <span className="shrink-0 text-sm font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Recent users */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Recent users
            </CardTitle>
            <CardDescription>Newest registered accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {data!.recentUsers.map((user) => (
                  <li key={user._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={cn('rounded-full text-[10px]', ROLE_STYLES[user.role] ?? 'bg-muted')}>
                        {user.role}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent projects */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4" /> Recent projects
            </CardTitle>
            <CardDescription>Newest created projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {data!.recentProjects.map((project) => (
                  <li key={project._id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/projects/${project._id}`}
                      className="flex items-center justify-between gap-3 rounded-xl transition-colors hover:bg-muted/40 -mx-2 px-2 py-1"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{project.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {project.department} · {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge className={cn('rounded-full text-[10px]', STATUS_STYLES[project.status] ?? 'bg-muted')}>
                          {STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </PageContainer>
  )
}
