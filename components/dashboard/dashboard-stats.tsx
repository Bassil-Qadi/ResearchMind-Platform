'use client'

import Link from 'next/link'
import { FolderKanban, Users, UserCircle, ArrowRight } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { StatCard } from '@/components/layout/stat-card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { categoryAccents } from '@/lib/accents'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS_STYLES as STATUS_STYLES } from '@/lib/status-styles'

const quickActions = [
  {
    href: '/projects',
    label: 'Browse projects',
    description: 'Discover open research opportunities',
    icon: FolderKanban,
    accent: 'projects' as const,
  },
  {
    href: '/directory',
    label: 'Find researchers',
    description: 'Search by department and interests',
    icon: Users,
    accent: 'directory' as const,
  },
  {
    href: '/profile/me',
    label: 'Edit profile',
    description: 'Update your academic information',
    icon: UserCircle,
    accent: 'profile' as const,
  },
]

interface DashboardStatsProps {
  role: string
}

export function DashboardStats({ role }: DashboardStatsProps) {
  const { data, isLoading } = useDashboardStats()

  return (
    <>
      {/* Stat cards */}
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Your role"
          value={role}
          description="University profile"
          icon={UserCircle}
          accent="profile"
        />
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Active projects"
              value={data?.activeProjects ?? 0}
              description={`${data?.recruitingProjects ?? 0} recruiting`}
              icon={FolderKanban}
              accent="projects"
            />
            <StatCard
              title="Researchers"
              value={data?.totalResearchers ?? 0}
              description="On the platform"
              icon={Users}
              accent="directory"
            />
          </>
        )}
      </div>

      {/* Activity + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent projects activity */}
        <Card className="card-interactive border-border/60 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Your projects</CardTitle>
            <CardDescription>Recently updated projects you&apos;re part of</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : data?.recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t joined any projects yet.
                </p>
                <Link
                  href="/projects"
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Browse projects →
                </Link>
              </div>
            ) : (
              <ul className="space-y-1">
                {data?.recentProjects.map((project) => (
                  <li key={project._id}>
                    <Link
                      href={`/projects/${project._id}`}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">
                          {project.title.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{project.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{project.department}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn('rounded-full text-[10px]', STATUS_STYLES[project.status])}>
                          {project.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base">Quick actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(({ href, label, description, icon: Icon, accent }) => {
              const colors = categoryAccents[accent]
              return (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                    colors.iconBg, colors.icon
                  )}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="truncate text-xs text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
