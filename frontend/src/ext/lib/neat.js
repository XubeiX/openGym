// Trend NEAT: daily steps and their moving average, by the weight MA rule (weight-ma.js): a window
// of 7 / 28 calendar days up to and including the day, a value only with 4 / 14 days of data in it.
import { isoOf } from '../../lib/format.js'
import { dayNo } from './weight-ma.js'

const MIN = { 7: 4, 28: 14 }
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

// rows: ptv4's body set ({ date, steps }), any length: days before a chart's window feed its first points.
// view: 7 or 28. today: ISO date, never counted (its steps are not finished); so isn't a day with 0 steps, as in ptv4.
// { days: [{ d, steps }], line: [{ d, avg }] }, oldest first.
export function neatTrend({ rows, view, today }) {
  const days = rows.filter(r => r.date < today && r.steps > 0).map(r => ({ d: r.date, steps: r.steps }))
    .sort((a, b) => a.d.localeCompare(b.d))
  const steps = new Map(days.map(r => [dayNo(r.d), r.steps]))
  const line = []
  for (let d = days[0]?.d; d && d < today; d = addDays(d, 1)) {
    const n = dayNo(d), vals = []
    for (let k = 0; k < view; k++) if (steps.has(n - k)) vals.push(steps.get(n - k))
    if (vals.length >= MIN[view]) line.push({ d, avg: vals.reduce((a, b) => a + b, 0) / vals.length })
  }
  return { days, line }
}
