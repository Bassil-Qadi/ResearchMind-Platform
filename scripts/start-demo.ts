/**
 * Serve the demo as a production build, for presenting it.
 *
 *   npm run seed:demo      reset the data first (this signs everyone out)
 *   npm run start:demo     → http://localhost:3001
 *   npm run start:demo -- --port 3005
 *
 * dev:demo is the development server. It shows a "Development login" hint on
 * the login page and compiles each page the first time it is used, which made
 * actions take seconds during rehearsal. This builds once and then serves the
 * app the way the real site runs.
 *
 * It overrides the same things as dev:demo (the demo database and this origin)
 * for this process only, and builds into its own folder, so it cannot disturb
 * `npm run dev` or dev:demo. Stop dev:demo first if it holds the same port.
 */
import { loadEnvConfig } from '@next/env'
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { demoDatabaseUri } from './demo-env'

loadEnvConfig(process.cwd())

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

const port   = argValue('--port') ?? process.env.DEMO_PORT ?? '3001'
const origin = `http://localhost:${port}`
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')

const env: NodeJS.ProcessEnv = {
  ...process.env,
  // A launcher (npm, an editor) may have set development; building in that mode
  // warns, produces an inconsistent build and brings back the dev-only login hint.
  NODE_ENV:            'production',
  // Next.js never overwrites a variable that is already set, so these win over .env.local.
  MONGODB_URI:         demoDatabaseUri(process.env.MONGODB_URI),
  AUTH_URL:            origin,
  NEXTAUTH_URL:        origin,
  // Inlined into the browser bundle at build time, so it must be set before building.
  NEXT_PUBLIC_APP_URL: origin,
  AUTH_TRUST_HOST:     'true',
  NEXT_DIST_DIR:       '.next-demo-prod',
}

function portIsFree(value: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(Number(value))
  })
}

function next(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`next ${args[0]} exited with code ${code}`))
    )
  })
}

async function main() {
  // Checked before building, so a busy port does not cost two minutes to discover.
  if (!(await portIsFree(port))) {
    throw new Error(
      `Port ${port} is already in use. Stop whatever holds it (dev:demo uses 3001), or run with -- --port <n>.`
    )
  }

  console.log(`Building the demo for ${origin} (a minute or two)…`)
  await next(['build'])

  console.log(`\nDemo ready: ${origin}`)
  await next(['start', '-p', port])
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
