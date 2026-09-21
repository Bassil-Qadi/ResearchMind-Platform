import { describe, expect, it } from 'vitest'
import { useDatabase } from '../helpers/db'
import { jsonRequest, makeProject, makeUser } from '../helpers/factories'
import { signedInAs } from '../helpers/session'

useDatabase()

const body = (res: Response) => res.json()
const names = (list: { name: string }[]) => list.map((u) => u.name).sort()

async function directory(query = '') {
  const { GET } = await import('@/app/api/users/route')
  return body(await GET(jsonRequest(`/api/users${query}`)))
}

async function projects(query = '') {
  const { GET } = await import('@/app/api/projects/route')
  return body(await GET(jsonRequest(`/api/projects${query}`)))
}

async function search(q: string) {
  const { GET } = await import('@/app/api/search/route')
  return body(await GET(jsonRequest(`/api/search?q=${encodeURIComponent(q)}`)))
}

describe('the directory', () => {
  it('finds a department whatever case it was stored in', async () => {
    const viewer = await makeUser({})
    await makeUser({ name: 'Lower Case', department: 'engineering' })
    await makeUser({ name: 'Title Case', department: 'Engineering' })

    await signedInAs(viewer)
    const res = await directory('?department=Engineering')

    expect(names(res.users)).toEqual(['Lower Case', 'Title Case'])
  })

  it('filters to the roles the old dropdown left out', async () => {
    const viewer = await makeUser({})
    await makeUser({ name: 'Rita Researcher', role: 'Researcher' })
    await makeUser({ name: 'Adam Admin',      role: 'Admin' })

    await signedInAs(viewer)
    expect(names((await directory('?role=Researcher')).users)).toEqual(['Rita Researcher'])
    expect(names((await directory('?role=Admin')).users)).toEqual(['Adam Admin'])
  })

  it('lists only active accounts', async () => {
    const viewer = await makeUser({ name: 'Viewer' })
    await makeUser({ name: 'Pending Person',   status: 'pending' })
    await makeUser({ name: 'Rejected Person',  status: 'rejected' })
    await makeUser({ name: 'Suspended Person', status: 'suspended' })

    await signedInAs(viewer)
    // Regression: these were all listed, and messaging one then failed.
    expect(names((await directory()).users)).toEqual(['Viewer'])
  })

  it('treats search text literally', async () => {
    const viewer = await makeUser({ name: 'Viewer' })
    await makeUser({ name: 'Ada Lovelace' })

    await signedInAs(viewer)
    // Unescaped, "." matched everyone and "(a+)+$" could hang the database.
    expect((await directory('?q=.')).users).toHaveLength(0)
    expect((await directory(`?q=${encodeURIComponent('(a+)+$')}`)).users).toHaveLength(0)
  })
})

describe('project filters', () => {
  it('finds a project whatever case its department was stored in', async () => {
    const pi = await makeUser({})
    const Project = (await import('@/lib/db/models/Project')).default

    const lower = await makeProject(pi, { title: 'Stored lower case' })
    await Project.updateOne({ _id: lower._id }, { $set: { department: 'engineering' } })
    const title = await makeProject(pi, { title: 'Stored title case' })
    await Project.updateOne({ _id: title._id }, { $set: { department: 'Engineering' } })

    await signedInAs(pi)
    const res = await projects('?department=Engineering')
    const titles = res.projects.map((p: { title: string }) => p.title).sort()

    // The page used to lower-case the filter to find the first; that broke the second.
    expect(titles).toEqual(['Stored lower case', 'Stored title case'])
  })
})

describe('departments are stored in one spelling', () => {
  it('on registration', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    await POST(jsonRequest('/x', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.201' },
      body: {
        name: 'New Person', email: 'new@university.edu', password: 'a-good-password',
        role: 'Student', department: '  natural   sciences ',
      },
    }))

    const { User } = await import('@/lib/db/models/user')
    expect((await User.findOne({ email: 'new@university.edu' }).lean())?.department)
      .toBe('Natural Sciences')
  })

  it('on project creation and edit', async () => {
    const pi = await makeUser({})
    await signedInAs(pi)

    const { POST } = await import('@/app/api/projects/route')
    const created = await body(await POST(jsonRequest('/x', {
      method: 'POST',
      body: {
        title: 'Normalised project', department: 'social sciences', startDate: '2026-01-01',
        abstract: 'An abstract long enough to satisfy the fifty character minimum imposed by the schema.',
        tags: [], openPositions: [],
      },
    })))
    expect(created.department).toBe('Social Sciences')

    const { PATCH } = await import('@/app/api/projects/[id]/route')
    const edited = await body(await PATCH(
      jsonRequest('/x', { method: 'PATCH', body: { department: 'BUSINESS & ECONOMICS' } }),
      { params: { id: created._id } }
    ))
    expect(edited.department).toBe('Business & Economics')
  })

  it('on a profile edit', async () => {
    const user = await makeUser({})
    await signedInAs(user)

    const { PATCH } = await import('@/app/api/users/me/route')
    const res = await body(await PATCH(jsonRequest('/x', {
      method: 'PATCH', body: { department: 'health sciences' },
    })))

    expect(res.department).toBe('Health Sciences')
  })
})

describe('GET /api/departments', () => {
  it('offers every canonical department plus any in use, without case duplicates', async () => {
    const viewer = await makeUser({ department: 'engineering' })
    await makeUser({ department: 'Computer Science' })

    await signedInAs(viewer)
    const { GET } = await import('@/app/api/departments/route')
    const { departments } = await body(await GET())

    expect(departments).toContain('Business & Economics') // canonical, even if unused
    expect(departments).toContain('Computer Science')   // legacy, still filterable
    expect(departments.filter((d: string) => d.toLowerCase() === 'engineering')).toHaveLength(1)
  })
})

describe('profiles of inactive accounts', () => {
  it('are hidden from others but still visible to their owner', async () => {
    const suspended = await makeUser({ status: 'suspended' })
    const viewer    = await makeUser({})
    const { GET } = await import('@/app/api/users/[id]/route')
    const params = { params: { id: suspended._id.toString() } }

    await signedInAs(viewer)
    expect((await GET(jsonRequest('/x'), params)).status).toBe(404)

    await signedInAs(suspended)
    expect((await GET(jsonRequest('/x'), params)).status).toBe(200)
  })
})

describe('the header search', () => {
  it('finds projects and people', async () => {
    // A department without 'comp' in it, so the query below matches only the project.
    const pi = await makeUser({ name: 'Grace Hopper', department: 'Engineering' })
    await makeProject(pi, { title: 'Compiler Construction' })

    await signedInAs(pi)
    const res = await search('comp')

    expect(res.projects.map((p: { title: string }) => p.title)).toEqual(['Compiler Construction'])
    expect(res.people).toEqual([])

    expect(names((await search('grace')).people)).toEqual(['Grace Hopper'])
  })

  it('never surfaces a stranger’s private project', async () => {
    const owner    = await makeUser({})
    const stranger = await makeUser({})
    await makeProject(owner, { title: 'Secret Protocol', visibility: 'private' })

    await signedInAs(stranger)
    expect((await search('secret')).projects).toEqual([])

    await signedInAs(owner)
    expect((await search('secret')).projects).toHaveLength(1)
  })

  it('never surfaces inactive or private people', async () => {
    const viewer = await makeUser({})
    await makeUser({ name: 'Zed Suspended', status: 'suspended' })
    await makeUser({ name: 'Zed Private', isPublic: false })
    await makeUser({ name: 'Zed Visible' })

    await signedInAs(viewer)
    expect(names((await search('zed')).people)).toEqual(['Zed Visible'])
  })

  it('waits for two characters and treats input literally', async () => {
    const viewer = await makeUser({ name: 'Ada' })

    await signedInAs(viewer)
    expect(await search('a')).toEqual({ projects: [], people: [] })
    expect((await search('..')).people).toEqual([])
  })
})

describe('the landing page figures', () => {
  it('count only what is real and active', async () => {
    const pi = await makeUser({ department: 'Engineering' })
    await makeUser({ department: 'engineering' }) // same department, other case
    await makeUser({ department: 'Medicine' })
    await makeUser({ status: 'pending', department: 'Somewhere Else' })
    await makeProject(pi, { status: 'active' })
    await makeProject(pi, { status: 'seeking' })
    await makeProject(pi, { status: 'completed' })

    const { getPlatformStats } = await import('@/lib/platform-stats')
    const stats = await getPlatformStats()

    expect(stats?.researchers).toBe(3)    // the pending account is not counted
    expect(stats?.activeProjects).toBe(2) // completed is not active
    // Engineering (two spellings) + Medicine, plus the projects' own department.
    expect(stats?.departments).toBeGreaterThanOrEqual(2)
    expect(stats?.departments).toBeLessThanOrEqual(3)
  })
})
