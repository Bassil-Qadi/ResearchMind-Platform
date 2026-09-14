import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AUTH_ERROR_MESSAGES, DEFAULT_AUTH_ERROR_MESSAGE } from '@/lib/auth/errors'

const nav = vi.hoisted(() => ({
  push:    vi.fn(),
  refresh: vi.fn(),
  params:  new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter:       () => ({ push: nav.push, refresh: nav.refresh }),
  useSearchParams: () => nav.params,
}))

const auth = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock('next-auth/react', () => ({ signIn: auth.signIn }))

import LoginPage from '@/app/(auth)/login/page'

beforeEach(() => {
  vi.clearAllMocks()
  nav.params = new URLSearchParams()
})

async function signInWith(email = 'researcher@yu.edu.jo', password = 'correct-horse') {
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

describe('Login page', () => {
  it('signs in without a full-page redirect, then goes to the page that sent them here', async () => {
    nav.params = new URLSearchParams('callbackUrl=/projects/abc')
    auth.signIn.mockResolvedValue({ ok: true, error: undefined })

    await signInWith()

    expect(auth.signIn).toHaveBeenCalledWith('credentials', {
      email:    'researcher@yu.edu.jo',
      password: 'correct-horse',
      redirect: false,
    })
    expect(nav.push).toHaveBeenCalledWith('/projects/abc')
    expect(nav.refresh).toHaveBeenCalled()
  })

  it('goes to the dashboard when nothing asked for a page', async () => {
    auth.signIn.mockResolvedValue({ ok: true, error: undefined })

    await signInWith()

    expect(nav.push).toHaveBeenCalledWith('/dashboard')
  })

  it('explains a pending account instead of a generic failure', async () => {
    auth.signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', code: 'account_pending' })

    await signInWith()

    expect(await screen.findByRole('alert')).toHaveTextContent(AUTH_ERROR_MESSAGES.account_pending)
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('falls back to a generic message for a code it does not know', async () => {
    auth.signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', code: 'something_new' })

    await signInWith()

    expect(await screen.findByRole('alert')).toHaveTextContent(DEFAULT_AUTH_ERROR_MESSAGE)
  })

  it('disables the button while signing in, so it cannot be sent twice', async () => {
    auth.signIn.mockReturnValue(new Promise(() => {}))

    await signInWith()

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  it('shows the approval message when an OAuth sign-in was denied', () => {
    nav.params = new URLSearchParams('error=AccessDenied')

    render(<LoginPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(/awaiting administrator approval/i)
  })

  it('links to password reset and to registration', () => {
    render(<LoginPage />)

    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: /request access/i })).toHaveAttribute('href', '/register')
  })
})
