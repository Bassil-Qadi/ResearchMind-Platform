# ResearchMind

University-wide platform for discovering research projects, forming teams, and collaborating in a single authenticated environment.

## Tech stack (Phase 1)

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand
- **Auth:** Auth.js v5 (NextAuth) with MongoDB adapter, dev credentials, OAuth/SAML placeholders
- **Database:** MongoDB (Mongoose), Redis (docker-compose, Phase 2+)

## Prerequisites

- Node.js 20+
- Docker (for local MongoDB and Redis)

## Local setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Generate a secret:

   ```bash
   openssl rand -base64 32
   ```

   Set `AUTH_SECRET` (and optionally `NEXTAUTH_SECRET`) in `.env.local`.

3. **Start databases**

   ```bash
   docker compose up -d
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Development login

Sign-in never creates accounts. Seed a local admin account first:

```bash
npm run seed
```

| Field    | Value                 |
|----------|-----------------------|
| Email    | `demo@university.edu` |
| Password | `demo123456`          |

Override the pair with `DEV_USER_EMAIL` / `DEV_USER_PASSWORD` in `.env.local`. The
seeded account gets the **Admin** role and `active` status for testing protected
routes; re-running the script resets its password rather than creating a duplicate.

Everyone else signs up at `/register`, which creates the account with `pending`
status — an Admin approves it from `/admin` before they can sign in.

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Start dev server         |
| `npm run build`   | Production build         |
| `npm run lint`    | ESLint                   |
| `npm run typecheck` | TypeScript check       |
| `npm test`        | Run the test suite       |
| `npm run test:watch` | Tests in watch mode   |
| `npm run seed`    | Seed the dev admin user  |
| `npm run sync-indexes` | Rebuild database indexes |

## Project structure

```
app/
  (auth)/login/          # Login page
  (dashboard)/           # Dashboard, projects, messages, directory, profile
  admin/                 # Admin area (Admin role only)
  api/                   # API routes (stubs for Phase 2+)
components/ui/           # shadcn components
components/layout/       # Sidebar, header, placeholders
lib/db/                  # Mongoose connection & models
lib/auth/                # NextAuth config, RBAC, providers
lib/validations/         # Zod schemas
hooks/ store/ types/     # Shared client utilities
middleware.ts            # Auth & RBAC route protection
```

## Tests

```bash
npm test
```

Unit tests cover the pure logic — rate limiting, project membership, the role
hierarchy, upload validation and email templates. Integration tests call the
route handlers directly against a real MongoDB started in memory, so schema
defaults, validators and indexes behave as they do in production; only
`auth()` is mocked, to choose who is calling.

No test touches the network: the Cloudinary and Resend variables are cleared
before the suite runs, so the code paths that guard on them are exercised
rather than skipped. The first run downloads a MongoDB binary and is slower
than later ones.

## CI

GitHub Actions runs lint, typecheck, and build on push/PR to `main`. See `.github/workflows/ci.yml`.

## Deployment (Netlify)

`netlify.toml` holds the build settings; everything else is set once in the
Netlify UI.

1. Create a site from the `ResearchMind-Platform` repository, branch `main`.
   The build command and publish directory come from `netlify.toml`.
2. Add the environment variables from `.env.example` under Site configuration →
   Environment variables. Notes:
   - `MONGODB_URI` must point at ResearchMind's own database, not another
     deployment's.
   - `AUTH_URL` and `NEXTAUTH_URL` must be the full `https://` site address, or
     sign-in redirects break.
   - `EMAIL_FROM` must use a domain verified in Resend.
   - Generate a fresh `AUTH_SECRET`/`NEXTAUTH_SECRET` per site:
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. Add the domain under Domain management. A domain can only belong to one
   Netlify site, so remove it from the old site first.

## Phase 2 (next)

- Project CRUD and MongoDB models
- Researcher directory search
- Socket.io messaging
- Email notifications (Resend)

## License

Private — ResearchMind
