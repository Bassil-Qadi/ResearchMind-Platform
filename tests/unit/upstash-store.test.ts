import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Redis } from '@upstash/redis'
import { UpstashRateLimitStore } from '@/lib/rate-limit/upstash-store'

type Entry = { score: number; member: string }

/**
 * Just enough of @upstash/redis to run the store's pipeline against an in-memory
 * sorted set, with Redis's inclusive ZREMRANGEBYSCORE and flat withScores replies.
 */
class FakeRedis {
  sets = new Map<string, Entry[]>()
  expiries = new Map<string, number>()
  failNextExec = false

  multi() {
    const ops: (() => unknown)[] = []
    const pipeline = {
      zremrangebyscore: (key: string, min: number, max: number) => {
        ops.push(() => {
          const all = this.sets.get(key) ?? []
          const kept = all.filter((e) => e.score < min || e.score > max)
          this.sets.set(key, kept)
          return all.length - kept.length
        })
        return pipeline
      },
      zadd: (key: string, entry: Entry) => {
        ops.push(() => {
          const all = [...(this.sets.get(key) ?? []), entry].sort((a, b) => a.score - b.score)
          this.sets.set(key, all)
          return 1
        })
        return pipeline
      },
      zcard: (key: string) => {
        ops.push(() => (this.sets.get(key) ?? []).length)
        return pipeline
      },
      zrange: (key: string, start: number, stop: number, opts?: { withScores?: boolean }) => {
        ops.push(() => {
          const slice = (this.sets.get(key) ?? []).slice(start, stop + 1)
          // Upstash sends scores as strings; the store must cope.
          return opts?.withScores ? slice.flatMap((e) => [e.member, String(e.score)]) : slice.map((e) => e.member)
        })
        return pipeline
      },
      pexpire: (key: string, ms: number) => {
        ops.push(() => {
          this.expiries.set(key, ms)
          return 1
        })
        return pipeline
      },
      exec: async () => {
        if (this.failNextExec) {
          this.failNextExec = false
          throw new Error('UpstashError: service unavailable')
        }
        return ops.map((op) => op())
      },
    }
    return pipeline
  }

  async del(key: string) {
    this.sets.delete(key)
    return 1
  }
}

function makeStore() {
  const fake = new FakeRedis()
  return { fake, store: new UpstashRateLimitStore(fake as unknown as Redis) }
}

afterEach(() => {
  vi.useRealTimers()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

describe('UpstashRateLimitStore', () => {
  it('counts every request in the window, past the limit', async () => {
    const { store } = makeStore()
    const counts = []
    for (let i = 0; i < 7; i++) counts.push((await store.hit('login:ip:1.2.3.4', 60_000, 5)).count)

    // Counting stops at nothing: a count capped at the limit would never block.
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('keeps keys separate, under its own prefix', async () => {
    const { fake, store } = makeStore()
    await store.hit('a', 60_000, 5)
    await store.hit('a', 60_000, 5)

    expect((await store.hit('b', 60_000, 5)).count).toBe(1)
    expect(Array.from(fake.sets.keys()).sort()).toEqual(['ratelimit:a', 'ratelimit:b'])
  })

  it('lets a window lapse once its entries age out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { store } = makeStore()

    for (let i = 0; i < 6; i++) await store.hit('k', 1_000, 5)
    vi.setSystemTime(Date.now() + 1_001)

    expect((await store.hit('k', 1_000, 5)).count).toBe(1)
  })

  it('reports when the window frees up, from the oldest entry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { store } = makeStore()

    const firstAt = Date.now()
    await store.hit('k', 60_000, 5)
    vi.setSystemTime(firstAt + 5_000)
    const later = await store.hit('k', 60_000, 5)

    expect(later.resetAt).toBe(firstAt + 60_000)
  })

  it('expires the key with the window on every hit, so idle keys do not linger', async () => {
    const { fake, store } = makeStore()
    await store.hit('k', 15 * 60_000, 10)

    expect(fake.expiries.get('ratelimit:k')).toBe(15 * 60_000)
  })

  it('forgets a key once reset', async () => {
    const { store } = makeStore()
    await store.hit('k', 60_000, 5)
    await store.hit('k', 60_000, 5)
    await store.reset('k')

    expect((await store.hit('k', 60_000, 5)).count).toBe(1)
  })

  it('lets a failure surface, so the caller can fall back', async () => {
    const { fake, store } = makeStore()
    fake.failNextExec = true

    await expect(store.hit('k', 60_000, 5)).rejects.toThrow(/service unavailable/)
  })
})

describe('UpstashRateLimitStore.fromEnv', () => {
  it('stays off unless both the REST URL and token are set', () => {
    expect(UpstashRateLimitStore.fromEnv()).toBeNull()

    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    expect(UpstashRateLimitStore.fromEnv()).toBeNull()

    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    expect(UpstashRateLimitStore.fromEnv()).toBeInstanceOf(UpstashRateLimitStore)
  })
})
