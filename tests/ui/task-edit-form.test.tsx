import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ITask } from '@/hooks/useProjectTasks'
import { TaskEditForm } from '@/components/tasks/task-edit-form'
import { jsonResponse, mockFetch, renderWithClient, sentBody } from '../helpers/ui'

const ASSIGNEE = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Lina Haddad' }
const URL = '/api/projects/p1/tasks/t1'

const task: ITask = {
  _id:         't1',
  projectId:   'p1',
  title:       'Draft the survey',
  description: 'Questions for the pilot group',
  status:      'todo',
  priority:    'medium',
  order:       0,
  dueDate:     '2026-10-01T00:00:00.000Z',
  assigneeId:  ASSIGNEE,
  createdBy:   { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Omar' },
  createdAt:   '2026-09-01T00:00:00.000Z',
  updatedAt:   '2026-09-01T00:00:00.000Z',
}

function renderForm() {
  const onDone = vi.fn()
  const view = renderWithClient(
    <TaskEditForm task={task} projectId="p1" members={[ASSIGNEE]} onDone={onDone} />
  )
  return { onDone, ...view }
}

describe('TaskEditForm', () => {
  it('starts from the task as it is', () => {
    renderForm()

    expect(screen.getByLabelText('Title')).toHaveValue('Draft the survey')
    expect(screen.getByLabelText('Description')).toHaveValue('Questions for the pilot group')
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-01')
  })

  it('closes without a request when nothing changed', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const { onDone } = renderForm()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Save task' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends only the fields that changed, then refreshes the board', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ...task, title: 'Draft the final survey' }))
    const { onDone, queryClient } = renderForm()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Draft the final survey')
    await user.click(screen.getByRole('button', { name: 'Save task' }))

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
    // Regression guard: sending every field overwrote other people's concurrent edits.
    expect(sentBody(fetchMock, URL, 'PATCH')).toEqual({ title: 'Draft the final survey' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks', 'p1'] })
  })

  it('sends null to clear the description and the due date', async () => {
    const fetchMock = mockFetch(() => jsonResponse(task))
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Description'))
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Save task' }))

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(sentBody(fetchMock, URL, 'PATCH')).toEqual({ description: null, dueDate: null })
  })

  it('refuses an empty title with the same message the server uses', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('Title'))
    await user.click(screen.getByRole('button', { name: 'Save task' }))

    expect(screen.getByText('A title is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('keeps the form open and shows the reason when saving fails', async () => {
    mockFetch(() => jsonResponse({ error: 'Only project members can edit tasks' }, 403))
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Title'), ' v2')
    await user.click(screen.getByRole('button', { name: 'Save task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only project members can edit tasks')
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save task' })).toBeEnabled()
  })

  it('cancels without saving', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))
    const { onDone } = renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Title'), ' (edited)')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
