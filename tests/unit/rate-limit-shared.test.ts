import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RateLimitHit, RateLimitStore } from '@/lib/rate-limit/store'
import {
  SHARED_RETRY_AFTER_MS,
  SHARED_TIMEOUT_MS,
  clientIp,
  rateLimit,
  setSharedRateLimitStore,
} from '@/lib/rate-limit'

const RULE = { limit: 5, windowMs: 60_000 }

let keyCounter = 0
const freshKey = () => `shared-test:${keyCounter++}`

/** A shared store whose behaviour each test decides. */
function fakeStore(hit: RateLimitStore['hit']): RateLimitStore & { hit: ReturnType<typeof vi.fn> } {
  return { name: 'upstash', hit: vi.fn(hit), reset: vi.fn(async () => {}) }
}

afterEach(() => {
  setSharedRateLimitStore(null)
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('rateLimit with a shared store', () => {
  it('enforces the shared count, not the in-process one', async () => {
    // Another instance has already used up this window.
    const shared = fakeStore(async (): Promise<RateLimitHit> => ({ count: 99, resetAt: Date.now() + 60_000 }))
    setSharedRateLimitStore(shared)

    const verdict = await rateLimit(freshKey(), RULE)

    expect(shared.hit).toHaveBeenCalledTimes(1)
    expect(verdict.allowed).toBe(false)
  })

  it('still limits in-process when the shared store fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setSharedRateLimitStore(fakeStore(async () => { throw new Error('Upstash is down') }))

    const key = freshKey()
    const verdicts = []
    for (let i = 0; i < 6; i++) verdicts.push((await rateLimit(key, RULE)).allowed)

    // Failing open on the infrastructure must not mean failing open on the rule.
    expect(verdicts).toEqual([true, true, true, true, true, false])
  })

  it('rests the shared store after a failure, then tries it again', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const shared = fakeStore(async () => { throw new Error('Upstash is down') })
    setSharedRateLimitStore(shared)

    await rateLimit(freshKey(), RULE)
    expect(shared.hit).toHaveBeenCalledTimes(1)

    // Within the rest period it is not asked at all, and nothing more is logged.
    await rateLimit(freshKey(), RULE)
    expect(shared.hit).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)

    // Regression: it used to stay switched off for the life of the process.
    vi.setSystemTime(Date.now() + SHARED_RETRY_AFTER_MS + 1)
    await rateLimit(freshKey(), RULE)
    expect(shared.hit).toHaveBeenCalledTimes(2)
  })

  it('abandons a shared store that does not answer, rather than hang the request', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setSharedRateLimitStore(fakeStore(() => new Promise<RateLimitHit>(() => {})))

    const pending = rateLimit(freshKey(), RULE)
    await vi.advanceTimersByTimeAsync(SHARED_TIMEOUT_MS)
    const verdict = await pending

    expect(verdict.allowed).toBe(true)
    expect(verdict.remaining).toBe(RULE.limit - 1)
  })
})

describe('clientIp on Netlify', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/x', { headers })

  it("prefers the platform's connection address over a forwarded-for the caller can write", () => {
    // Regression: a caller sending a new fake X-Forwarded-For each time was a new "IP" each time.
    expect(clientIp(req({
      'x-nf-client-connection-ip': '198.51.100.20',
      'x-forwarded-for':           '203.0.113.99, 198.51.100.20',
    }))).toBe('198.51.100.20')
  })

  it('keys two requests with different spoofed headers to the same caller', () => {
    const a = clientIp(req({ 'x-nf-client-connection-ip': '198.51.100.20', 'x-forwarded-for': '1.1.1.1' }))
    const b = clientIp(req({ 'x-nf-client-connection-ip': '198.51.100.20', 'x-forwarded-for': '2.2.2.2' }))
    expect(a).toBe(b)
  })

  it('still reads x-forwarded-for where the platform header is absent', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }))).toBe('203.0.113.5')
  })
})
