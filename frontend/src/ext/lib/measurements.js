import { isoOf } from '../../lib/format.js'
import { measurementEntryHasValues } from '../../lib/measurements.js'

// The last `n` calendar days, today first, each with its entry or null — the Home card lists
// the gaps too, since yesterday's empty row is the one you came to fill in (calories and steps
// are only final once the day is over). Empty unless something was logged in the last 14 days:
// a profile that measures its waist once a month has no use for a daily grid.
export function recentMeasurementDays(state, today, n = 5) {
  const byDate = new Map((state.measurements || []).filter(measurementEntryHasValues).map(e => [e.d, e]))
  const day = i => {
    const at = new Date(today + 'T12:00:00')
    at.setDate(at.getDate() - i)
    return isoOf(at)
  }
  if (!Array.from({ length: 14 }, (_, i) => day(i)).some(d => byDate.has(d))) return []
  return Array.from({ length: n }, (_, i) => ({ d: day(i), entry: byDate.get(day(i)) || null }))
}
