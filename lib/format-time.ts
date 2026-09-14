/**
 * When a message was sent, for the line under it in a chat thread.
 *
 * Threads used to show only the clock time, so a message from last week read
 * as if it had arrived this morning. Anything not from today now carries its
 * day as well.
 */
export function messageTime(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (days <= 0) return time
  if (days === 1) return `Yesterday, ${time}`
  if (days < 7) return `${date.toLocaleDateString([], { weekday: 'short' })}, ${time}`

  const sameYear = date.getFullYear() === now.getFullYear()
  const day = date.toLocaleDateString([], {
    month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `${day}, ${time}`
}
