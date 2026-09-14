import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // tsconfig keeps JSX as-is for Next.js to compile; the component tests need it compiled here.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    // Component tests need a DOM. Everything else keeps running in Node.
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts', 'tests/setup-dom.ts'],
    // Route tests share one in-memory MongoDB, and several assert on counters
    // that live in module state, so files must not run concurrently.
    fileParallelism: false,
    // Downloading and booting the MongoDB binary on a cold cache is slow.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    server: {
      deps: {
        // Left external, Node resolves next-auth's bare "next/server" import
        // against the filesystem and misses the package's export map. Letting
        // Vite process them applies the export map instead.
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
