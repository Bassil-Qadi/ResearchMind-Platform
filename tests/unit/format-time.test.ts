import { describe, expect, it } from 'vitest'
import { messageTime } from '@/lib/format-time'

// Local-time constructors, so the calendar-day rules hold in any timezone.
const NOW = new Date(2026, 8, 15, 14, 30)
const at = (day: number, hour: number, minute = 0, month = 8, year = 2026) =>
  new Date(year, month, day, hour, minute)
const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

describe('messageTime', () => {
  it('shows only the time for a message from today', () => {
    const earlier = at(15, 9, 5)
    expect(messageTime(earlier, NOW)).toBe(clock(earlier))
  })

  it('says yesterday by calendar day, even when less than 24 hours ago', () => {
    const lateLastNight = at(14, 23, 50)
    expect(messageTime(lateLastNight, NOW)).toBe(`Yesterday, ${clock(lateLastNight)}`)
  })

  it('uses the weekday within the last week', () => {
    const threeDaysAgo = at(12, 11)
    const weekday = threeDaysAgo.toLocaleDateString([], { weekday: 'short' })
    expect(messageTime(threeDaysAgo, NOW)).toBe(`${weekday}, ${clock(threeDaysAgo)}`)
  })

  it('uses the date for anything older, adding the year only when it differs', () => {
    // Regression: an 8-day-old message showed nothing but "3:43 AM".
    const lastWeek = at(7, 15, 43)
    expect(messageTime(lastWeek, NOW)).toContain(lastWeek.toLocaleDateString([], { month: 'short', day: 'numeric' }))
    expect(messageTime(lastWeek, NOW)).not.toContain('2026')

    const lastYear = at(20, 10, 0, 11, 2025)
    expect(messageTime(lastYear, NOW)).toContain('2025')
  })

  it('accepts the ISO strings the API returns', () => {
    expect(messageTime(at(15, 9).toISOString(), NOW)).toBe(clock(at(15, 9)))
  })
})
