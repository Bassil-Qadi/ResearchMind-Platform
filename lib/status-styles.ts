import type { UserStatus } from '@/types'

/**
 * Badge colours for everything that carries a status or a role.
 *
 * These were copied into four files, and the copies had drifted: a Researcher
 * was green on the admin dashboard and teal in the user table. One definition,
 * imported everywhere, so that cannot happen again.
 *
 * Each value is a tint plus readable text in both themes. Callers add their own
 * shape (rounded-full, text size, borders).
 */

/** Project.status — see lib/db/models/Project. */
export const PROJECT_STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-600/15 text-green-800 dark:text-green-300',
  seeking:   'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  paused:    'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  completed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
}

/**
 * What people read for Project.status. The stored value "seeking" is shown as
 * "Recruiting", which the project page and filters already called it; the
 * admin dashboard printed the raw lowercase value.
 */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  seeking:   'Recruiting',
  paused:    'Paused',
  completed: 'Completed',
}

/** User.status — the account lifecycle, not a project's. */
export const USER_STATUS_STYLES: Record<UserStatus, string> = {
  active:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  pending:   'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  rejected:  'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  suspended: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

export const ROLE_STYLES: Record<string, string> = {
  Admin:      'bg-red-500/15 text-red-700 dark:text-red-300',
  Faculty:    'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  Researcher: 'bg-lime-600/15 text-lime-800 dark:text-lime-300',
  Staff:      'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Student:    'bg-green-600/15 text-green-800 dark:text-green-300',
}

/** A neutral pill for a value nobody has given a colour. */
export const UNKNOWN_BADGE = 'bg-muted'
