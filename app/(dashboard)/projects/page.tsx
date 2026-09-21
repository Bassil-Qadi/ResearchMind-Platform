'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'  // we'll add this below
import { Grid3X3, List, SlidersHorizontal } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectCard, type ProjectCardProps } from '@/components/shells/project-card'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjects, type ProjectSummary } from '@/hooks/useProjects'
import { useDepartments } from '@/hooks/useDepartments'
import { cn } from '@/lib/utils'

/** Project statuses as the API stores them, in the card's own vocabulary. */
const CARD_STATUS: Record<ProjectSummary['status'], ProjectCardProps['status']> = {
  active:    'active',
  seeking:   'recruiting',
  completed: 'completed',
  paused:    'paused',
}

const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Recruiting', value: 'seeking' },
  { label: 'Active',    value: 'active' },
  { label: 'My projects', value: 'mine' },
]

export default function ProjectsPage() {
  const [view, setView]           = useState<'grid' | 'list'>('grid')
  const [activeFilter, setFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [department, setDept]     = useState('')
  const debouncedSearch           = useDebounce(search, 400)
  const DEPARTMENTS               = ['All departments', ...useDepartments()]

  const { data, isLoading, isError } = useProjects({
    q:          debouncedSearch || undefined,
    status:     activeFilter !== 'mine' ? activeFilter || undefined : undefined,
    mine:       activeFilter === 'mine',
    department: department && department !== 'All departments' ? department : undefined,
  })

  const projects = data?.projects ?? []

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Discover and join research projects across the university."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects' },
        ]}
        actions={<CreateProjectDialog />}
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setFilter(pill.value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                activeFilter === pill.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'border border-border/60 bg-card/80 text-muted-foreground hover:border-blue-500/30 hover:text-foreground'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm rounded-xl"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <SlidersHorizontal className="h-4 w-4" />
                  {department && department !== 'All departments' ? department : 'Department'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {DEPARTMENTS.map((d) => (
                  <DropdownMenuItem key={d} onClick={() => setDept(d)}>
                    {d}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/50 p-1">
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="sm"
              className="h-8 rounded-lg px-2" onClick={() => setView('grid')} aria-label="Grid view">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm"
              className="h-8 rounded-lg px-2" onClick={() => setView('list')} aria-label="List view">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {isError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load projects. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className={cn('gap-4', view === 'grid'
          ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col')}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <p className="font-display font-semibold">No projects found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total} project{data?.pagination.total !== 1 ? 's' : ''} found
          </p>
          <div className={cn('stagger-children gap-4', view === 'grid'
            ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'flex flex-col')}>
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                id={project._id}
                title={project.title}
                description={project.abstract}
                department={project.department}
                status={CARD_STATUS[project.status]}
                memberCount={project.members.length}
                updatedAt={new Date(project.updatedAt).toLocaleDateString()}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  )
}