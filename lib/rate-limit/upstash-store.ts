import { Redis } from '@upstash/redis'
import type { RateLimitHit, RateLimitStore } from '@/lib/rate-limit/store'

/**
 * Sliding-window log in a Redis sorted set, reached over Upstash's REST API, so
 * every instance counts against the same window.
 *
 * REST rather than a TCP client because the app runs on serverless functions.
 * Each cold start would otherwise open, and could time out on, a fresh socket,
 * and the TCP client this replaced never worked at all: it was created with
 * lazyConnect and no offline queue, so its first command was always refused and
 * the limiter silently fell back to per-instance counting for good.
 *
 * Errors are thrown, not swallowed. The caller times out slow calls and falls
 * back to counting in-process.
 */
export class UpstashRateLimitStore implements RateLimitStore {
  readonly name = 'upstash'

  constructor(
    private readonly client: Redis,
    private readonly prefix = 'ratelimit:'
  ) {}

  /** Null unless both variables are set, so local runs and tests need no Redis. */
  static fromEnv(): UpstashRateLimitStore | null {
    const url   = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null

    return new UpstashRateLimitStore(
      new Redis({
        url,
        token,
        // The caller gives up after 1.5s regardless; retrying longer only delays the fallback.
        retry: { retries: 1, backoff: () => 100 },
      })
    )
  }

  async hit(key: string, windowMs: number, _limit: number): Promise<RateLimitHit> {
    const now      = Date.now()
    const cutoff   = now - windowMs
    const redisKey = `${this.prefix}${key}`
    // Unique per hit, so two requests in the same millisecond both count.
    const member   = `${now}-${Math.random().toString(36).slice(2, 10)}`

    // One HTTP request, run atomically and in order: drop entries older than the
    // window, record this hit, count, find the oldest for resetAt, and expire the
    // key so an idle caller's history does not linger.
    const [, , count, oldest] = await this.client
      .multi()
      .zremrangebyscore(redisKey, 0, cutoff)
      .zadd(redisKey, { score: now, member })
      .zcard(redisKey)
      .zrange(redisKey, 0, 0, { withScores: true })
      .pexpire(redisKey, windowMs)
      .exec()

    // withScores returns [member, score]; the score may arrive as a string.
    const oldestScore = Array.isArray(oldest) ? Number(oldest[1]) : now

    return {
      count:   Number(count),
      resetAt: (Number.isFinite(oldestScore) ? oldestScore : now) + windowMs,
    }
  }

  async reset(key: string): Promise<void> {
    await this.client.del(`${this.prefix}${key}`)
  }
}
