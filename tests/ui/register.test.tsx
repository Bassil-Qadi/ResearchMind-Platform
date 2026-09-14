import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jsonResponse, mockFetch, sentBody } from '../helpers/ui'
import RegisterPage from '@/app/(auth)/register/page'

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: { confirm?: string } = {}) {
  await user.type(screen.getByLabelText('Full name'), 'Lina Haddad')
  await user.type(screen.getByLabelText(/email/i), 'lina@yu.edu.jo')

  // Found by their visible labels, which is also how a screen reader names them.
  await user.click(screen.getByRole('combobox', { name: 'Role' }))
  await user.click(await screen.findByRole('option', { name: 'Researcher' }))

  await user.click(screen.getByRole('combobox', { name: 'Department' }))
  await user.click(await screen.findByRole('option', { name: 'Faculty of Science' }))

  await user.type(screen.getByLabelText('Password'), 'long-enough-password')
  await user.type(screen.getByLabelText('Confirm password'), overrides.confirm ?? 'long-enough-password')
}

describe('Register page', () => {
  it('shows what is missing, in words, and sends nothing', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: 'Request access' }))

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument()
    expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    // Regression: untouched selects only said "Required".
    expect(screen.getByText('Select a role')).toBeInTheDocument()
    expect(screen.getByText('Department is required')).toBeInTheDocument()
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears a select error as soon as a value is picked', async () => {
    mockFetch(() => jsonResponse({}))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole('button', { name: 'Request access' }))
    expect(await screen.findByText('Select a role')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Student' }))

    expect(screen.queryByText('Select a role')).not.toBeInTheDocument()
  })

  it('catches mismatched passwords before sending', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user, { confirm: 'something-else' })
    await user.click(screen.getByRole('button', { name: 'Request access' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits the details and says the account awaits approval', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ message: 'Registration submitted.' }, 201))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Request access' }))

    expect(await screen.findByText('Registration submitted!')).toBeInTheDocument()
    expect(sentBody(fetchMock, '/api/auth/register', 'POST')).toMatchObject({
      name:       'Lina Haddad',
      email:      'lina@yu.edu.jo',
      role:       'Researcher',
      department: 'Faculty of Science',
      password:   'long-enough-password',
    })
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login')
  })

  it("shows the server's reason when registration is refused", async () => {
    mockFetch(() => jsonResponse({ error: { email: ['An account with this email already exists'] } }, 409))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Request access' }))

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
    expect(screen.queryByText('Registration submitted!')).not.toBeInTheDocument()
  })
})
