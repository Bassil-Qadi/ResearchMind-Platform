'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
import { ResearcherCard } from '@/components/shells/researcher-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUsers } from '@/hooks/useUsers'
import { useDebounce } from '@/hooks/useDebounce'
import { useDepartments } from '@/hooks/useDepartments'
import { USER_ROLES } from '@/types'

// Every role the platform has — Researcher and Admin used to be missing, so
// half the real accounts could not be filtered to.
const ROLES = ['All roles', ...USER_ROLES]

export default function DirectoryPage() {
  const [search, setSearch]     = useState('')
  const [department, setDept]   = useState('')
  const [role, setRole]         = useState('')
  const debouncedSearch         = useDebounce(search, 400)
  const DEPARTMENTS             = ['All departments', ...useDepartments()]

  const { data, isLoading, isError } = useUsers({
    q:          debouncedSearch || undefined,
    department: department && department !== 'All departments' ? department : undefined,
    role:       role && role !== 'All roles' ? role : undefined,
  })

  const users = data?.users ?? []

  return (
    <PageContainer>
      <PageHeader
        title="Researcher Directory"
        description="Search faculty, students, and staff by department and research interests."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Directory' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name, department, or interest…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-lg rounded-xl"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl sm:w-auto">
              <SlidersHorizontal className="h-4 w-4" />
              {department && department !== 'All departments' ? department : 'Department'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DEPARTMENTS.map((d) => (
              <DropdownMenuItem key={d} onClick={() => setDept(d)}>{d}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl sm:w-auto">
              {role && role !== 'All roles' ? role : 'Role'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ROLES.map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRole(r)}>{r}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load researchers. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <p className="font-display font-semibold">No researchers found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total} researcher{data?.pagination.total !== 1 ? 's' : ''} found
          </p>
          <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <ResearcherCard
                key={user._id}
                id={user._id}
                name={user.name}
                title={`${user.position ?? user.role}${user.department ? `, ${user.department}` : ''}`}
                department={user.department ?? ''}
                interests={user.researchInterests ?? []}
                avatarUrl={user.avatarUrl}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  )
}