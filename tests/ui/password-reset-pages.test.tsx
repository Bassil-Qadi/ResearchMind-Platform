import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { callsTo, jsonResponse, mockFetch, sentBody } from '../helpers/ui'

const nav = vi.hoisted(() => ({ push: vi.fn(), params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  useRouter:       () => ({ push: nav.push }),
  useSearchParams: () => nav.params,
}))

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'

beforeEach(() => {
  vi.clearAllMocks()
  nav.params = new URLSearchParams()
})

describe('Forgot password page', () => {
  it('sends the address and says a link is on its way', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ message: 'If that address has an account…' }))
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled()
    await user.type(screen.getByLabelText(/email/i), 'lina@yu.edu.jo')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(screen.getByText('lina@yu.edu.jo')).toBeInTheDocument()
    expect(sentBody(fetchMock, '/api/auth/forgot-password', 'POST')).toEqual({ email: 'lina@yu.edu.jo' })
  })

  it('lets them go back and use a different address', async () => {
    mockFetch(() => jsonResponse({ message: 'ok' }))
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'lina@yu.edu.jo')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await user.click(await screen.findByRole('button', { name: 'Use a different address' }))

    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument()
  })

  it('shows a field error from validation', async () => {
    mockFetch(() => jsonResponse({ error: { fieldErrors: { email: ['Enter a valid email address'] } } }, 422))
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address')
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
  })

  it('shows the rate-limit message as written', async () => {
    mockFetch(() => jsonResponse({ error: 'Too many reset requests. Please try again later.' }, 429))
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText(/email/i), 'lina@yu.edu.jo')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many reset requests')
  })
})

describe('Reset password page', () => {
  const URL = '/api/auth/reset-password'

  async function submit(password: string, confirm = password) {
    const user = userEvent.setup()
    render(<ResetPasswordPage />)
    await user.type(screen.getByLabelText('New password'), password)
    await user.type(screen.getByLabelText('Confirm new password'), confirm)
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    return user
  }

  it('says straight away when the link has no token', () => {
    render(<ResetPasswordPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/i)
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('refuses a short password without asking the server', async () => {
    nav.params = new URLSearchParams('token=abc123')
    const fetchMock = mockFetch(() => jsonResponse({}))

    await submit('short')

    expect(screen.getByRole('alert')).toHaveTextContent('at least 8 characters')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses mismatched passwords without asking the server', async () => {
    nav.params = new URLSearchParams('token=abc123')
    const fetchMock = mockFetch(() => jsonResponse({}))

    await submit('long-enough-1', 'long-enough-2')

    expect(screen.getByRole('alert')).toHaveTextContent('do not match')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the token with the new password, then offers sign-in', async () => {
    nav.params = new URLSearchParams('token=abc123')
    const fetchMock = mockFetch(() => jsonResponse({ message: 'Your password has been changed.' }))

    const user = await submit('long-enough-password')

    expect(await screen.findByText(/your password has been changed/i)).toBeInTheDocument()
    expect(sentBody(fetchMock, URL, 'POST')).toEqual({ token: 'abc123', password: 'long-enough-password' })
    expect(callsTo(fetchMock, URL, 'POST')).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(nav.push).toHaveBeenCalledWith('/login')
  })

  it('shows why an expired or used link was refused', async () => {
    nav.params = new URLSearchParams('token=spent')
    mockFetch(() => jsonResponse({ error: 'This reset link has expired or has already been used.' }, 400))

    await submit('long-enough-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('expired or has already been used')
  })
})
