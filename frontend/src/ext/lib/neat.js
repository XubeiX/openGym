// Trend NEAT: daily steps and their moving average, by the weight MA rule (weight-ma.js): a window
// of 7 / 28 calendar days up to and including the day, a value only with 4 / 14 days of data in it.
import { isoOf } from '../../lib/format.js'
import { dayNo } from './weight-ma.js'

const MIN = { 7: 4, 28: 14 }
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

// The average of `len` days up to and including day number n; null below the minimum of days with data.
function avgOf(steps, n, len) {
  const vals = []
  for (let k = 0; k < len; k++) if (steps.has(n - k)) vals.push(steps.get(n - k))
  return vals.length >= MIN[len] ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

// Sygnał NEAT, always from the 7-day average: yesterday's { avg, base, pct } when each of the last SIGNAL_DAYS
// days has a 7-day average at least `threshold` % under its base, the 28 days before those 7. Else null.
const SIGNAL_DAYS = 5
function neatSignal(steps, today, threshold) {
  const last = dayNo(today) - 1
  const at = n => ({ avg: avgOf(steps, n, 7), base: avgOf(steps, n - 7, 28) })
  const meets = ({ avg, base }) => avg != null && base != null && avg * 100 <= base * (100 - threshold)
  for (let k = 0; k < SIGNAL_DAYS; k++) if (!meets(at(last - k))) return null
  const { avg, base } = at(last)
  return { avg, base, pct: (avg - base) * 100 / base }
}

// rows: ptv4's body set ({ date, steps }), any length: days before a chart's window feed its first points.
// view: 7 or 28. threshold: the signal's drop in %. today: ISO date, never counted (its steps are not finished);
// so isn't a day with 0 steps, as in ptv4.
// { days: [{ d, steps }], line: [{ d, avg }], signal: { avg, base, pct } | null }, oldest first.
export function neatTrend({ rows, view, threshold, today }) {
  const days = rows.filter(r => r.date < today && r.steps > 0).map(r => ({ d: r.date, steps: r.steps }))
    .sort((a, b) => a.d.localeCompare(b.d))
  const steps = new Map(days.map(r => [dayNo(r.d), r.steps]))
  const line = []
  for (let d = days[0]?.d; d && d < today; d = addDays(d, 1)) {
    const avg = avgOf(steps, dayNo(d), view)
    if (avg != null) line.push({ d, avg })
  }
  return { days, line, signal: neatSignal(steps, today, threshold) }
}
