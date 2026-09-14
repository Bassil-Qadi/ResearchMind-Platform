/**
 * Run the app locally against the demo database, for rehearsing a presentation.
 *
 *   npm run dev:demo        → http://localhost:3001
 *
 * Nothing in .env.local changes: the database, the app's own URL and the build
 * folder are overridden for this process only. It uses its own build folder and
 * port, because two dev servers sharing .next corrupt each other, and the usual
 * one may well be running on 3000.
 */
import { loadEnvConfig } from '@next/env'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { demoDatabaseUri } from './demo-env'

loadEnvConfig(process.cwd())

const port   = process.env.DEMO_PORT ?? '3001'
const origin = `http://localhost:${port}`

const child = spawn(
  process.execPath,
  [path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', port],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Next.js never overwrites a variable that is already set, so these win over .env.local.
      MONGODB_URI:         demoDatabaseUri(process.env.MONGODB_URI),
      AUTH_URL:            origin,
      NEXTAUTH_URL:        origin,
      NEXT_PUBLIC_APP_URL: origin,
      NEXT_DIST_DIR:       '.next-demo',
    },
  }
)

child.on('exit', (code) => process.exit(code ?? 0))
