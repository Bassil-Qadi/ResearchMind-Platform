/**
 * Prove the rate limit is shared, against the real Upstash database.
 *
 * Serverless hosting runs many separate instances, and the whole point of the
 * shared store is that they count together. This starts two separate Node
 * processes — as two instances would be — that hit the same key, and checks the
 * second one sees the first one's hits.
 *
 *   npx tsx scripts/check-rate-limit.ts
 *
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from .env.local and
 * never prints them. Uses a throwaway key and deletes it afterwards.
 */
import { loadEnvConfig } from '@next/env'
import { execFileSync } from 'node:child_process'
import { UpstashRateLimitStore } from '@/lib/rate-limit/upstash-store'

loadEnvConfig(process.cwd())

const WINDOW_MS = 60_000
const LIMIT     = 5

async function child(key: string, hits: number) {
  const store = UpstashRateLimitStore.fromEnv()
  if (!store) throw new Error('Upstash is not configured')

  const counts: number[] = []
  for (let i = 0; i < hits; i++) counts.push((await store.hit(key, WINDOW_MS, LIMIT)).count)
  process.stdout.write(JSON.stringify({ pid: process.pid, counts }))
}

function runChild(key: string, hits: number): { pid: number; counts: number[] } {
  const out = execFileSync(
    process.execPath,
    [...process.execArgv, __filename, '--child', key, String(hits)],
    { encoding: 'utf8', env: process.env }
  )
  return JSON.parse(out.trim().split('\n').pop()!)
}

async function main() {
  if (process.argv[2] === '--child') {
    await child(process.argv[3], Number(process.argv[4]))
    return
  }

  const store = UpstashRateLimitStore.fromEnv()
  if (!store) {
    console.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set in .env.local')
    process.exitCode = 1
    return
  }

  const key = `check:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    const first  = runChild(key, 3)
    const second = runChild(key, 3)

    console.log(`process ${first.pid}  counted: ${first.counts.join(', ')}`)
    console.log(`process ${second.pid}  counted: ${second.counts.join(', ')}`)

    const shared  = JSON.stringify(second.counts) === JSON.stringify([4, 5, 6])
    const blocked = second.counts[second.counts.length - 1] > LIMIT
    console.log(shared
      ? `\nSHARED: the second process continued the first one's count, and hit ${LIMIT + 1} is over the limit of ${LIMIT} (${blocked ? 'blocked' : 'NOT blocked'}).`
      : '\nNOT SHARED: each process counted on its own. The limit would not hold across instances.')
    if (!shared || !blocked) process.exitCode = 1
  } finally {
    await store.reset(key)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
