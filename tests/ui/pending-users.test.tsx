import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PendingUsers } from '@/components/admin/pending-users'
import { jsonResponse, mockFetch, renderWithClient, sentBody } from '../helpers/ui'

const LIST_URL = '/api/admin/users?status=pending'

const applicants = [
  {
    _id: 'u1', name: 'Lina Haddad', email: 'lina@university.edu', role: 'Researcher',
    department: 'Natural Sciences', position: 'PhD Student', createdAt: '2026-09-10T00:00:00.000Z',
  },
  {
    _id: 'u2', name: 'Omar Nasser', email: 'omar@university.edu', role: 'Student',
    department: 'Law', createdAt: '2026-09-11T00:00:00.000Z',
  },
]

function serve(patch: () => Response = () => jsonResponse({ ok: true })) {
  return mockFetch((url, { method }) =>
    method === 'GET' && url === LIST_URL ? jsonResponse({ users: applicants }) : patch()
  )
}

describe('PendingUsers', () => {
  it('lists each applicant with a count', async () => {
    serve()

    renderWithClient(<PendingUsers />)

    expect(await screen.findByText('Lina Haddad')).toBeInTheDocument()
    expect(screen.getByText('Natural Sciences · PhD Student')).toBeInTheDocument()
    expect(screen.getByText('Omar Nasser')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('says all caught up when nobody is waiting', async () => {
    mockFetch(() => jsonResponse({ users: [] }))

    renderWithClient(<PendingUsers />)

    expect(await screen.findByText('All caught up')).toBeInTheDocument()
  })

  it('approving activates the account and removes it from the queue', async () => {
    const fetchMock = serve()
    const user = userEvent.setup()
    renderWithClient(<PendingUsers />)

    await screen.findByText('Lina Haddad')
    await user.click(screen.getAllByRole('button', { name: 'Approve' })[0])

    await waitFor(() => expect(screen.queryByText('Lina Haddad')).not.toBeInTheDocument())
    expect(sentBody(fetchMock, '/api/admin/users/u1', 'PATCH')).toEqual({ status: 'active' })
  })

  it('refreshes the user table and stats too, so the page does not contradict itself', async () => {
    serve()
    const user = userEvent.setup()
    const { queryClient } = renderWithClient(<PendingUsers />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await screen.findByText('Lina Haddad')
    await user.click(screen.getAllByRole('button', { name: 'Approve' })[0])

    // Regression: the table below kept showing an approved account as pending.
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin-users'] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin-stats'] })
    expect(screen.getByText('Omar Nasser')).toBeInTheDocument()
  })

  it('rejecting sends rejected', async () => {
    const fetchMock = serve()
    const user = userEvent.setup()
    renderWithClient(<PendingUsers />)

    await screen.findByText('Omar Nasser')
    await user.click(screen.getAllByRole('button', { name: 'Reject' })[1])

    await waitFor(() => expect(screen.queryByText('Omar Nasser')).not.toBeInTheDocument())
    expect(sentBody(fetchMock, '/api/admin/users/u2', 'PATCH')).toEqual({ status: 'rejected' })
  })

  it('keeps the applicant and explains when the change fails', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    serve(() => jsonResponse({ error: 'Only administrators can change accounts' }, 403))
    const user = userEvent.setup()
    renderWithClient(<PendingUsers />)

    await screen.findByText('Lina Haddad')
    await user.click(screen.getAllByRole('button', { name: 'Approve' })[0])

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Only administrators can change accounts'))
    expect(screen.getByText('Lina Haddad')).toBeInTheDocument()
  })
})
