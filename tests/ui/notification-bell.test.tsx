import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { INotification } from '@/hooks/useNotifications'
import { callsTo, jsonResponse, mockFetch, renderWithClient } from '../helpers/ui'

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1' } } }) }))

import { NotificationBell } from '@/components/layout/notification-bell'

const unread: INotification = {
  _id:       'n1',
  type:      'join-request',
  title:     'New join request',
  body:      'Sami asked to join "Soil sensors".',
  link:      '/projects/p1',
  read:      false,
  createdAt: '2026-09-10T09:00:00.000Z',
}
const read: INotification = { ...unread, _id: 'n2', title: 'Task assigned', link: undefined, read: true }

function serve(notifications: INotification[], unreadCount: number) {
  return mockFetch((url, { method }) =>
    method === 'GET' && url === '/api/notifications'
      ? jsonResponse({ notifications, unreadCount })
      : jsonResponse({ ok: true })
  )
}

beforeEach(() => vi.clearAllMocks())

describe('NotificationBell', () => {
  it('shows the unread count, capped at 9+', async () => {
    serve([], 12)

    renderWithClient(<NotificationBell />)

    expect(await screen.findByText('9+')).toBeInTheDocument()
  })

  it('shows no badge when everything is read', async () => {
    const fetchMock = serve([read], 0)

    renderWithClient(<NotificationBell />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Notifications' })).not.toHaveTextContent(/\d/)
  })

  it('opening an unread notification marks it read and follows its link', async () => {
    const fetchMock = serve([unread, read], 1)
    const user = userEvent.setup()
    renderWithClient(<NotificationBell />)

    await screen.findByText('1')
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(await screen.findByText('New join request'))

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/projects/p1'))
    expect(callsTo(fetchMock, '/api/notifications/n1', 'PATCH')).toBe(1)
  })

  it('does not mark an already-read notification again', async () => {
    const fetchMock = serve([unread, read], 1)
    const user = userEvent.setup()
    renderWithClient(<NotificationBell />)

    await screen.findByText('1')
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(await screen.findByText('Task assigned'))

    expect(callsTo(fetchMock, '/api/notifications/n2', 'PATCH')).toBe(0)
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('marks everything read at once and clears the badge', async () => {
    const fetchMock = serve([unread], 1)
    const user = userEvent.setup()
    renderWithClient(<NotificationBell />)

    await screen.findByText('1')
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(await screen.findByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
    expect(callsTo(fetchMock, '/api/notifications/read', 'PATCH')).toBe(1)
  })

  it('says all caught up when there are none', async () => {
    serve([], 0)
    const user = userEvent.setup()
    renderWithClient(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(await screen.findByText('All caught up')).toBeInTheDocument()
  })
})
