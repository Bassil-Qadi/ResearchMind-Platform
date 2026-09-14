import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JoinRequest } from '@/hooks/useJoinRequests'
import { JoinRequestsPanel } from '@/components/projects/join-requests-panel'
import { RequestToJoinDialog } from '@/components/projects/request-to-join-dialog'
import { jsonResponse, mockFetch, renderWithClient, sentBody } from '../helpers/ui'

const LIST_URL   = '/api/projects/p1/join-requests'
const REVIEW_URL = '/api/projects/p1/join-requests/r1'

const pending: JoinRequest = {
  _id:       'r1',
  projectId: 'p1',
  status:    'pending',
  createdAt: '2026-09-10T00:00:00.000Z',
  position:  'Data analyst',
  message:   'I have run similar field studies.',
  userId: {
    _id:        'u2',
    name:       'Sami Khalil',
    department: 'Faculty of Science',
    position:   'PhD Student',
  },
}

describe('JoinRequestsPanel', () => {
  it('renders nothing, and loads nothing, for someone who cannot review', () => {
    const fetchMock = mockFetch(() => jsonResponse({ requests: [pending] }))

    const { container } = renderWithClient(<JoinRequestsPanel projectId="p1" canReview={false} />)

    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says so when nobody is waiting', async () => {
    mockFetch(() => jsonResponse({ requests: [] }))

    renderWithClient(<JoinRequestsPanel projectId="p1" canReview />)

    expect(await screen.findByText('No pending requests')).toBeInTheDocument()
  })

  it('shows who is asking, for what, and why', async () => {
    mockFetch(() => jsonResponse({ requests: [pending] }))

    renderWithClient(<JoinRequestsPanel projectId="p1" canReview />)

    expect(await screen.findByRole('link', { name: 'Sami Khalil' })).toHaveAttribute('href', '/profile/u2')
    expect(screen.getByText('PhD Student · Faculty of Science')).toBeInTheDocument()
    expect(screen.getByText('Applying for: Data analyst')).toBeInTheDocument()
    expect(screen.getByText('I have run similar field studies.')).toBeInTheDocument()
  })

  it('approves with the chosen role, contributor by default', async () => {
    const fetchMock = mockFetch((url, { method }) =>
      method === 'PATCH' ? jsonResponse({ ...pending, status: 'approved' }) : jsonResponse({ requests: [pending] })
    )
    const user = userEvent.setup()
    renderWithClient(<JoinRequestsPanel projectId="p1" canReview />)

    await user.click(await screen.findByRole('button', { name: 'Approve' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, REVIEW_URL, 'PATCH')).toEqual({ status: 'approved', role: 'contributor' })
    )
  })

  it('approves as co-PI when that role is picked', async () => {
    const fetchMock = mockFetch((url, { method }) =>
      method === 'PATCH' ? jsonResponse({ ...pending, status: 'approved' }) : jsonResponse({ requests: [pending] })
    )
    const user = userEvent.setup()
    renderWithClient(<JoinRequestsPanel projectId="p1" canReview />)

    // Named per applicant, so a screen reader can tell one row's role from the next.
    await user.click(await screen.findByRole('combobox', { name: 'Role for Sami Khalil' }))
    await user.click(await screen.findByRole('option', { name: 'Co-PI' }))
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, REVIEW_URL, 'PATCH')).toEqual({ status: 'approved', role: 'co-pi' })
    )
  })

  it('shows why a decline failed and lets them try again', async () => {
    mockFetch((url, { method }) =>
      method === 'PATCH'
        ? jsonResponse({ error: 'This request has already been reviewed' }, 409)
        : jsonResponse({ requests: [pending] })
    )
    const user = userEvent.setup()
    renderWithClient(<JoinRequestsPanel projectId="p1" canReview />)

    await user.click(await screen.findByRole('button', { name: 'Decline' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This request has already been reviewed')
    expect(screen.getByRole('button', { name: 'Decline' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
  })
})

describe('RequestToJoinDialog', () => {
  it('sends a trimmed message and closes', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ _id: 'r9' }, 201))
    const user = userEvent.setup()
    renderWithClient(<RequestToJoinDialog projectId="p1" openPositions={[]} />)

    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/message/i), '  I study soil sensors  ')
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // An untouched position is left out rather than sent as an empty string.
    expect(sentBody(fetchMock, LIST_URL, 'POST')).toEqual({ message: 'I study soil sensors' })
  })

  it('only asks about a position when the project has open ones', async () => {
    mockFetch(() => jsonResponse({}))
    const user = userEvent.setup()
    renderWithClient(<RequestToJoinDialog projectId="p1" openPositions={['Data analyst']} />)

    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('combobox', { name: /position/i }))
      .toHaveTextContent(/which position are you interested in/i)
  })

  it('stays open with the reason when the request is refused', async () => {
    mockFetch(() => jsonResponse({ error: 'You already have a pending request for this project' }, 409))
    const user = userEvent.setup()
    renderWithClient(<RequestToJoinDialog projectId="p1" openPositions={[]} />)

    await user.click(screen.getByRole('button', { name: 'Request to join' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already have a pending request')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
