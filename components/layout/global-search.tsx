'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Loader2, Search } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'

interface SearchResults {
  projects: { _id: string; title: string; department?: string; status: string }[]
  people:   { _id: string; name: string; department?: string; position?: string; avatarUrl?: string }[]
}

interface Hit {
  key:   string
  href:  string
  kind:  'project' | 'person'
  title: string
  meta?: string
  avatarUrl?: string
}

const MIN_LENGTH = 2

export function GlobalSearch() {
  const router  = useRouter()
  const listId  = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [text, setText]     = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(0)

  const q = useDebounce(text.trim(), 250)
  const searching = q.length >= MIN_LENGTH

  const { data, isFetching } = useQuery<SearchResults>({
    queryKey: ['search', q],
    queryFn:  () => apiFetch(`/api/search?q=${encodeURIComponent(q)}`),
    enabled:  searching,
    staleTime: 30_000,
  })

  // One flat list, so the arrow keys move straight from projects into people.
  const hits: Hit[] = useMemo(() => [
    ...(data?.projects ?? []).map((p) => ({
      key: `p-${p._id}`, href: `/projects/${p._id}`, kind: 'project' as const,
      title: p.title, meta: p.department,
    })),
    ...(data?.people ?? []).map((u) => ({
      key: `u-${u._id}`, href: `/profile/${u._id}`, kind: 'person' as const,
      title: u.name, meta: [u.position, u.department].filter(Boolean).join(' · '),
      avatarUrl: u.avatarUrl,
    })),
  ], [data])

  useEffect(() => setActive(0), [q])

  // Close when focus or a click lands anywhere else.
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  function go(hit: Hit) {
    setOpen(false)
    setText('')
    inputRef.current?.blur()
    router.push(hit.href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!hits.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(hits[active] ?? hits[0])
    }
  }

  const showPanel = open && searching
  const activeId  = hits[active] ? `${listId}-${hits[active].key}` : undefined

  function group(kind: Hit['kind'], label: string) {
    const items = hits.filter((h) => h.kind === kind)
    if (!items.length) return null

    return (
      <div role="group" aria-label={label}>
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {items.map((hit) => {
          const index = hits.indexOf(hit)
          return (
            <div
              key={hit.key}
              id={`${listId}-${hit.key}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(e) => e.preventDefault()} // keep focus in the input
              onClick={() => go(hit)}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'mx-1 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2',
                index === active && 'bg-accent'
              )}
            >
              {hit.kind === 'person' ? (
                <UserAvatar name={hit.title} src={hit.avatarUrl} className="h-7 w-7 shrink-0" fallbackClassName="text-[10px]" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <FolderKanban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{hit.title}</p>
                {hit.meta && <p className="truncate text-xs text-muted-foreground">{hit.meta}</p>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="search-glow relative hidden max-w-md flex-1 rounded-xl transition-shadow duration-300 md:block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel ? activeId : undefined}
        aria-autocomplete="list"
        aria-label="Search projects and people"
        placeholder="Search projects and people…"
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border border-input/80 bg-muted/40 pl-10 pr-9 text-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none"
      />
      {isFetching && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-xl border border-border/60 bg-popover pb-1 shadow-lg"
        >
          {hits.length ? (
            <>
              {group('project', 'Projects')}
              {group('person', 'People')}
            </>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {isFetching ? 'Searching…' : `Nothing matches “${q}”.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
