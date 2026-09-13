export interface RateLimitHit {
  /** How many requests have been counted in the current window, including this one. */
  count:   number
  /** When the oldest counted request falls out of the window (epoch ms). */
  resetAt: number
}

export interface RateLimitStore {
  readonly name: string
  /** Record a hit against `key` and report the state of its window. */
  hit(key: string, windowMs: number, limit: number): Promise<RateLimitHit>
  reset(key: string): Promise<void>
}

/**
 * Sliding-window log held in this process.
 *
 * Correct for a single server — which is what `npm start` runs. With several
 * instances each keeps its own counts, so the effective limit multiplies by the
 * instance count. Serverless hosting runs many short-lived instances, so set
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to share one count.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  readonly name = 'memory'

  private windows = new Map<string, number[]>()
  /** Bound on distinct keys, so a flood of unique IPs cannot exhaust memory. */
  private readonly maxKeys = 10_000

  async hit(key: string, windowMs: number, limit: number): Promise<RateLimitHit> {
    const now    = Date.now()
    const cutoff = now - windowMs

    const timestamps = (this.windows.get(key) ?? []).filter((t) => t > cutoff)
    timestamps.push(now)

    // Count before trimming: capping the array at `limit` would cap the count
    // at `limit` too, and a count that can never exceed the limit never blocks.
    const count = timestamps.length

    // One past the limit is all that is needed to keep saying no, and it keeps
    // a determined caller from growing this array without bound.
    if (timestamps.length > limit + 1) {
      timestamps.splice(0, timestamps.length - (limit + 1))
    }

    if (!this.windows.has(key) && this.windows.size >= this.maxKeys) this.prune(cutoff)
    this.windows.set(key, timestamps)

    return {
      count,
      resetAt: (timestamps[0] ?? now) + windowMs,
    }
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key)
  }

  private prune(cutoff: number) {
    for (const [key, timestamps] of Array.from(this.windows.entries())) {
      const live = timestamps.filter((t) => t > cutoff)
      if (live.length === 0) this.windows.delete(key)
      else this.windows.set(key, live)
    }

    // Still full of live windows: drop the oldest to stay bounded.
    if (this.windows.size >= this.maxKeys) {
      const oldestFirst = Array.from(this.windows.entries())
        .sort((a, b) => (a[1][0] ?? 0) - (b[1][0] ?? 0))
        .slice(0, Math.floor(this.maxKeys / 4))
      for (const [key] of oldestFirst) this.windows.delete(key)
    }
  }
}
