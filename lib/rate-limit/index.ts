import { MemoryRateLimitStore, type RateLimitStore } from '@/lib/rate-limit/store'
import { UpstashRateLimitStore } from '@/lib/rate-limit/upstash-store'

export interface RateLimitRule {
  /** Requests permitted per window. */
  limit:    number
  windowMs: number
}

export interface RateLimitVerdict {
  allowed:   boolean
  limit:     number
  remaining: number
  resetAt:   number
  /** Seconds until the caller may retry; only meaningful when blocked. */
  retryAfter: number
}

/** Rules are named so the same limit can be applied consistently. */
export const RATE_LIMITS = {
  /** Creates an account AND sends mail to the applicant and every admin. */
  register:     { limit: 5,  windowMs: 60 * 60 * 1000 },
  /** Slows credential stuffing without locking a real person out for long. */
  login:        { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Mails every PI and co-PI of the project. */
  joinRequest:  { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Third-party storage quota is finite. */
  upload:       { limit: 30, windowMs: 60 * 60 * 1000 },
  /** Person-to-person messages: generous for real use, capped for a script. */
  directMessage: { limit: 60, windowMs: 5 * 60 * 1000 },
  /** Comments notify everyone in the thread, so they get the same ceiling. */
  comment:       { limit: 60, windowMs: 5 * 60 * 1000 },
  /** Sends mail to an address the caller chose, so it is kept tight. */
  passwordReset: { limit: 5,  windowMs: 60 * 60 * 1000 },
  /** Guessing a 32-byte token is hopeless, but there is no reason to allow it. */
  passwordResetAttempt: { limit: 20, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>

interface RateLimitState {
  memory: MemoryRateLimitStore
  /** The shared store: undefined until first looked up, null when unconfigured. */
  shared?: RateLimitStore | null
  /** Skip the shared store until this time (epoch ms) after it has failed. */
  sharedDownUntil?: number
}

declare global {
  // eslint-disable-next-line no-var
  var rateLimitState: RateLimitState | undefined
}

/**
 * Held on globalThis, the same way the Mongoose connection is: route modules
 * are re-evaluated between requests in development, and a counter that resets
 * on every request is not a rate limit at all.
 */
const state: RateLimitState = global.rateLimitState ?? {
  memory: new MemoryRateLimitStore(),
}
global.rateLimitState = state

/**
 * How long to count in-process after the shared store fails before trying it
 * again. It used to be switched off for good on the first error, so one slow
 * cold start quietly turned a global limit back into a per-instance one.
 */
export const SHARED_RETRY_AFTER_MS = 30_000

/** A limiter that makes sign-in wait on a slow network call is worse than none. */
export const SHARED_TIMEOUT_MS = 1_500

function getStores(): RateLimitStore[] {
  if (state.shared === undefined) state.shared = UpstashRateLimitStore.fromEnv()

  const resting = Date.now() < (state.sharedDownUntil ?? 0)
  if (!state.shared || resting) return [state.memory]

  return [state.shared, state.memory]
}

/**
 * Replace the shared store, or pass null to count in-process only. Tests use it
 * to exercise the fallback without a real Redis.
 */
export function setSharedRateLimitStore(store: RateLimitStore | null): void {
  state.shared = store
  state.sharedDownUntil = 0
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Count a request against `key` and decide whether it may proceed.
 *
 * Deliberately fails *closed on the rule, open on the infrastructure*: if the
 * shared store is unreachable or slow, the in-process store still applies the
 * limit, so losing Redis degrades accuracy rather than removing protection.
 */
export async function rateLimit(
  key: string,
  rule: RateLimitRule
): Promise<RateLimitVerdict> {
  const [primary, fallback] = getStores()

  let hit
  try {
    hit = primary === state.memory
      ? await primary.hit(key, rule.windowMs, rule.limit)
      : await withTimeout(primary.hit(key, rule.windowMs, rule.limit), SHARED_TIMEOUT_MS)
  } catch (err) {
    if (primary === state.memory) throw err

    // Warn once per outage rather than on every request during it.
    if (Date.now() >= (state.sharedDownUntil ?? 0)) {
      console.warn(
        `[rate-limit] ${primary.name} unavailable, counting in-process for ${SHARED_RETRY_AFTER_MS / 1000}s:`,
        err instanceof Error ? err.message : err
      )
    }
    state.sharedDownUntil = Date.now() + SHARED_RETRY_AFTER_MS
    hit = await (fallback ?? state.memory).hit(key, rule.windowMs, rule.limit)
  }

  const allowed = hit.count <= rule.limit

  return {
    allowed,
    limit:      rule.limit,
    remaining:  Math.max(0, rule.limit - hit.count),
    resetAt:    hit.resetAt,
    retryAfter: Math.max(1, Math.ceil((hit.resetAt - Date.now()) / 1000)),
  }
}

/**
 * Best-effort client address.
 *
 * On Netlify, x-nf-client-connection-ip is set by the platform from the actual
 * connection, and a caller cannot supply it. x-forwarded-for can carry entries
 * the caller wrote, so reading its first entry first let anyone send a new fake
 * address with every request and never meet a per-IP limit. The remaining
 * headers cover other proxies and local runs; treat all of them as friction,
 * not identity.
 */
export function clientIp(req: Request): string {
  const netlify = req.headers.get('x-nf-client-connection-ip')?.trim()
  if (netlify) return netlify

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

/** Standard headers so clients can back off intelligently. */
export function rateLimitHeaders(verdict: RateLimitVerdict): Record<string, string> {
  return {
    'RateLimit-Limit':     String(verdict.limit),
    'RateLimit-Remaining': String(verdict.remaining),
    'RateLimit-Reset':     String(Math.ceil((verdict.resetAt - Date.now()) / 1000)),
    ...(verdict.allowed ? {} : { 'Retry-After': String(verdict.retryAfter) }),
  }
}
