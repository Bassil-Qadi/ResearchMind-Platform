/**
 * Environment every test file gets before it runs.
 *
 * Nothing here reaches the network: the database is an in-memory MongoDB
 * started per run, and the third-party integrations are left unconfigured so
 * that code paths guarding on them are exercised rather than skipped.
 */

process.env.AUTH_SECRET ??= 'test-secret-at-least-32-characters-long'
process.env.NEXTAUTH_URL ??= 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000'

// Tests that need these opt in explicitly by setting them.
delete process.env.CLOUDINARY_URL
delete process.env.CLOUDINARY_CLOUD_NAME
delete process.env.CLOUDINARY_API_KEY
delete process.env.CLOUDINARY_API_SECRET
delete process.env.RESEND_API_KEY
// Without these, publishing is a no-op and nothing tries to reach Pusher.
delete process.env.PUSHER_APP_ID
delete process.env.PUSHER_SECRET
delete process.env.NEXT_PUBLIC_PUSHER_KEY
delete process.env.NEXT_PUBLIC_PUSHER_CLUSTER
// No Redis in tests: the rate limiter counts in-process unless a test opts in.
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN
