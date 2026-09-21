/**
 * Snap stored department names to the canonical spellings in lib/departments.
 *
 * Records created before normaliseDepartment existed hold whatever was typed —
 * "school of engineering" and "Computer Sciencess" are two of them. They still
 * work (filters merge unknown values back in) but they read as different
 * departments to anyone browsing, and they never match a canonical filter.
 *
 * Reports what it would change and exits:
 *   npm run normalise-departments
 *
 * Actually writes:
 *   npm run normalise-departments -- --apply
 *
 * Values that do not match the canonical list case-insensitively are LEFT
 * ALONE and listed separately — a typo is a judgement call, not a migration.
 * Where that call has been made, it goes in ALIASES below.
 */
import { loadEnvConfig } from '@next/env'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/connect'
import { User } from '@/lib/db/models/user'
import Project from '@/lib/db/models/Project'
import { DEPARTMENTS, normaliseDepartment } from '@/lib/departments'

loadEnvConfig(process.cwd())

const apply = process.argv.includes('--apply')

const canonical = new Set<string>(DEPARTMENTS)

/**
 * Spellings from earlier department lists, mapped by hand onto the current
 * fields. Each entry is a decision someone made about where that department
 * belongs, not something the script could work out — so they live here in the
 * open. Keys are matched trimmed, whitespace-collapsed and lowercased.
 */
const ALIASES: Record<string, string> = {
  // The first placeholder list this platform shipped with.
  'school of engineering':        'Engineering',
  'college of natural sciences':  'Natural Sciences',
  'school of social sciences':    'Social Sciences',
  'school of medicine':           'Medicine',
  'school of business':           'Business & Economics',
  'college of arts & humanities': 'Arts & Humanities',
  'school of education':          'Education',
  // Faculty names, for data brought over from a single-university install.
  'faculty of medicine':          'Medicine',
  'faculty of pharmacy':          'Pharmacy',
  'faculty of nursing':           'Nursing',
  'faculty of science':           'Natural Sciences',
  'faculty of engineering':       'Engineering',
  'faculty of business':          'Business & Economics',
  'faculty of arts':              'Arts & Humanities',
  'faculty of law':               'Law',
  'faculty of educational sciences': 'Education',
  'faculty of mass communication':   'Media & Communication',
  // Typed by hand before any list existed.
  'computer sciencess': 'Computer Science & IT',
  'computer science':   'Computer Science & IT',
}

function resolve(value: string): string {
  const tidy  = value.trim().replace(/\s+/g, ' ')
  const alias = ALIASES[tidy.toLowerCase()]
  return alias ?? normaliseDepartment(tidy)
}

interface Row {
  id:    string
  label: string
  from:  string
  to:    string
}

function classify(records: { _id: mongoose.Types.ObjectId; department?: string | null }[],
                  label: (r: any) => string) {
  const changes:  Row[] = []
  const unknowns: Row[] = []

  for (const r of records) {
    const from = r.department ?? ''
    const to   = resolve(from)
    const row  = { id: r._id.toString(), label: label(r), from, to }

    if (from !== to)            changes.push(row)
    else if (!canonical.has(to)) unknowns.push(row)
  }

  return { changes, unknowns }
}

function report(title: string, { changes, unknowns }: { changes: Row[]; unknowns: Row[] }) {
  console.log(`\n${title}`)

  if (!changes.length) console.log('  nothing to normalise')
  for (const c of changes) {
    console.log(`  ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}   ${c.label}`)
  }

  if (unknowns.length) {
    console.log('  not on the canonical list, left as written:')
    for (const u of unknowns) console.log(`    ${JSON.stringify(u.from)}   ${u.label}`)
  }
}

async function main() {
  await connectDB()
  console.log(`database: ${mongoose.connection.name}`)
  console.log(apply ? 'mode: APPLY (writing)' : 'mode: dry run (pass --apply to write)')

  const users    = await User.find().select('name department').lean()
  const projects = await Project.find().select('title department').lean()

  const userResult    = classify(users,    (u) => u.name)
  const projectResult = classify(projects, (p) => p.title)

  report(`users (${users.length})`, userResult)
  report(`projects (${projects.length})`, projectResult)

  const total = userResult.changes.length + projectResult.changes.length
  if (!apply || total === 0) {
    console.log(`\n${total} record(s) would change.`)
    return
  }

  for (const c of userResult.changes) {
    await User.updateOne({ _id: c.id }, { $set: { department: c.to } })
  }
  for (const c of projectResult.changes) {
    await Project.updateOne({ _id: c.id }, { $set: { department: c.to } })
  }

  console.log(`\n${total} record(s) updated.`)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
