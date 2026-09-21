import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { useDatabase } from '../helpers/db'
import { TEST_PASSWORD, jsonRequest, makeUser } from '../helpers/factories'

useDatabase()

const body = (res: Response) => res.json()

// Limits are counted per origin and the store is process-wide, so unrelated
// calls get unrelated addresses. A test that means to trip a limit says so by
// passing one explicitly.
let ipCounter = 0
const freshIp = () => `203.0.113.${(ipCounter++ % 250) + 1}`

async function routes() {
  const forgot = await import('@/app/api/auth/forgot-password/route')
  const reset  = await import('@/app/api/auth/reset-password/route')
  return { forgot: forgot.POST, reset: reset.POST }
}

function ask(email: string, ip = freshIp()) {
  return jsonRequest('/x', {
    method:  'POST',
    body:    { email },
    headers: { 'x-forwarded-for': ip },
  })
}

function submit(token: string, password: string, ip = freshIp()) {
  return jsonRequest('/x', {
    method:  'POST',
    body:    { token, password },
    headers: { 'x-forwarded-for': ip },
  })
}

/** The token as it went into the email, recovered the only way a test can. */
async function issuedToken(email: string) {
  const { forgot } = await routes()
  const res = await forgot(ask(email))
  expect(res.status).toBe(200)

  // The row holds only a hash, so read the token from what the route logged.
  const PasswordResetToken = (await import('@/lib/db/models/PasswordResetToken')).default
  const { User } = await import('@/lib/db/models/user')
  const user = await User.findOne({ email }).lean()
  const row  = await PasswordResetToken.findOne({ userId: user?._id }).lean()
  return { row, userId: user?._id }
}

describe('asking for a reset link', () => {
  it('issues a single-use token for an active account', async () => {
    const user = await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { row } = await issuedToken('hana@university.edu')

    expect(row).toBeTruthy()
    expect(row!.userId.toString()).toBe(user._id.toString())
    expect(row!.usedAt).toBeFalsy()
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now())
    // Never the token itself: a dump of this collection must be useless.
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('answers the same for an address with no account', async () => {
    const { forgot } = await routes()

    const known   = await makeUser({ email: 'real@university.edu', status: 'active' })
    const withReal = await forgot(ask('real@university.edu'))
    const withFake = await forgot(ask('nobody@university.edu'))

    expect(withReal.status).toBe(200)
    expect(withFake.status).toBe(200)
    // Regression guard: any difference here is an account-enumeration oracle.
    expect(await body(withFake)).toEqual(await body(withReal))
    expect(known).toBeTruthy()
  })

  it('issues nothing for an account that cannot sign in anyway', async () => {
    const PasswordResetToken = (await import('@/lib/db/models/PasswordResetToken')).default
    const { forgot } = await routes()

    for (const status of ['pending', 'rejected', 'suspended'] as const) {
      const user = await makeUser({ email: `${status}@university.edu`, status })
      const res  = await forgot(ask(`${status}@university.edu`))

      expect(res.status).toBe(200)
      expect(await PasswordResetToken.countDocuments({ userId: user._id })).toBe(0)
    }
  })

  it('retires the previous link when a second is asked for', async () => {
    const PasswordResetToken = (await import('@/lib/db/models/PasswordResetToken')).default
    await makeUser({ email: 'hana@university.edu', status: 'active' })

    const first  = await issuedToken('hana@university.edu')
    const second = await issuedToken('hana@university.edu')

    expect(await PasswordResetToken.countDocuments()).toBe(1)
    expect(second.row!.tokenHash).not.toBe(first.row!.tokenHash)
  })

  it('rejects an address that is not one', async () => {
    const { forgot } = await routes()
    expect((await forgot(ask('not-an-email'))).status).toBe(422)
  })

  it('stops a flood of requests from one origin', async () => {
    await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { forgot } = await routes()

    const codes: number[] = []
    for (let i = 0; i < 7; i++) {
      codes.push((await forgot(ask('hana@university.edu', '198.51.100.7'))).status)
    }

    expect(codes).toContain(429)
  })
})

describe('using a reset link', () => {
  async function tokenFor(email: string) {
    // Mirror what the route does, so the test holds a usable token.
    const { generateResetToken, hashResetToken, resetTokenExpiry } =
      await import('@/lib/auth/password-reset')
    const PasswordResetToken = (await import('@/lib/db/models/PasswordResetToken')).default
    const { User } = await import('@/lib/db/models/user')

    const user  = await User.findOne({ email }).lean()
    const token = generateResetToken()
    await PasswordResetToken.create({
      userId:    user!._id,
      tokenHash: hashResetToken(token),
      expiresAt: resetTokenExpiry(),
    })
    return { token, userId: user!._id }
  }

  it('sets the new password and lets the old one go', async () => {
    await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { token } = await tokenFor('hana@university.edu')
    const { reset } = await routes()

    const res = await reset(submit(token, 'a-brand-new-password'))
    expect(res.status).toBe(200)

    const { User } = await import('@/lib/db/models/user')
    const after = await User.findOne({ email: 'hana@university.edu' })
      .select('+passwordHash passwordChangedAt')
      .lean()

    expect(await bcrypt.compare('a-brand-new-password', after!.passwordHash!)).toBe(true)
    expect(await bcrypt.compare(TEST_PASSWORD, after!.passwordHash!)).toBe(false)
    expect(after!.passwordChangedAt).toBeTruthy()
  })

  it('works exactly once', async () => {
    await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { token } = await tokenFor('hana@university.edu')
    const { reset } = await routes()

    expect((await reset(submit(token, 'first-new-password'))).status).toBe(200)

    const second = await reset(submit(token, 'second-new-password'))
    expect(second.status).toBe(400)

    // And the second attempt must not have taken effect.
    const { User } = await import('@/lib/db/models/user')
    const after = await User.findOne({ email: 'hana@university.edu' }).select('+passwordHash').lean()
    expect(await bcrypt.compare('first-new-password', after!.passwordHash!)).toBe(true)
  })

  it('refuses an expired link', async () => {
    await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { generateResetToken, hashResetToken } = await import('@/lib/auth/password-reset')
    const PasswordResetToken = (await import('@/lib/db/models/PasswordResetToken')).default
    const { User } = await import('@/lib/db/models/user')

    const user  = await User.findOne({ email: 'hana@university.edu' }).lean()
    const token = generateResetToken()
    await PasswordResetToken.create({
      userId:    user!._id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() - 1000),
    })

    const { reset } = await routes()
    expect((await reset(submit(token, 'a-brand-new-password'))).status).toBe(400)
  })

  it('refuses a token nobody issued', async () => {
    const { reset } = await routes()
    const res = await reset(submit('made-up-token', 'a-brand-new-password'))

    expect(res.status).toBe(400)
    expect((await body(res)).error).toMatch(/invalid or has expired/i)
  })

  it('refuses a password that is too short, and changes nothing', async () => {
    await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { token } = await tokenFor('hana@university.edu')
    const { reset } = await routes()

    const res = await reset(submit(token, 'short'))
    expect(res.status).toBe(422)

    // The link must still work afterwards.
    expect((await reset(submit(token, 'a-brand-new-password'))).status).toBe(200)
  })

  it('refuses a link for an account suspended since it was issued', async () => {
    const user = await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { token } = await tokenFor('hana@university.edu')

    const { User } = await import('@/lib/db/models/user')
    await User.updateOne({ _id: user._id }, { $set: { status: 'suspended' } })

    const { reset } = await routes()
    expect((await reset(submit(token, 'a-brand-new-password'))).status).toBe(400)
  })
})

describe('sessions issued before the reset', () => {
  it('are refused at revalidation', async () => {
    const user = await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { revalidateToken } = await import('@/lib/auth/revalidate')

    const issuedAt = Math.floor(Date.now() / 1000) - 600 // ten minutes ago
    const token    = { id: user._id.toString(), iat: issuedAt, checkedAt: 0 }

    // Still good before anything changes.
    expect(await revalidateToken({ ...token })).toBeTruthy()

    const { User } = await import('@/lib/db/models/user')
    await User.updateOne({ _id: user._id }, { $set: { passwordChangedAt: new Date() } })

    // Regression: a reset that leaves the old session alive protects nobody.
    expect(await revalidateToken({ ...token, checkedAt: 0 })).toBeNull()
  })

  it('leaves a session issued after the reset alone', async () => {
    const user = await makeUser({ email: 'hana@university.edu', status: 'active' })
    const { User } = await import('@/lib/db/models/user')
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordChangedAt: new Date(Date.now() - 60_000) } }
    )

    const { revalidateToken } = await import('@/lib/auth/revalidate')
    const fresh = {
      id:        user._id.toString(),
      iat:       Math.floor(Date.now() / 1000),
      checkedAt: 0,
    }

    expect(await revalidateToken(fresh)).toBeTruthy()
  })
})
