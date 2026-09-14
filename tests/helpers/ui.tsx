import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

/** Render inside a fresh React Query client that never retries, so failures show at once. */
export function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries:   { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Handler = (url: string, init: RequestInit & { method: string }) => Response | Promise<Response>

/**
 * Replace fetch for the current test. The handler sees the URL and the method
 * (defaulted to GET); the returned mock records every call.
 */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), { ...init, method: init?.method ?? 'GET' })
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

/** The parsed JSON body of the first call to `url` with `method`. */
export function sentBody(fetchMock: ReturnType<typeof mockFetch>, url: string, method: string) {
  const call = fetchMock.mock.calls.find(
    ([input, init]) => String(input) === url && (init?.method ?? 'GET') === method
  )
  if (!call) throw new Error(`No ${method} ${url} was sent`)
  return JSON.parse(String(call[1]?.body))
}

export function callsTo(fetchMock: ReturnType<typeof mockFetch>, url: string, method: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) => String(input) === url && (init?.method ?? 'GET') === method
  ).length
}
