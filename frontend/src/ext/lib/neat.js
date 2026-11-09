// Trend NEAT: daily steps and their moving average, by the weight MA rule (weight-ma.js): a window
// of 7 / 28 calendar days up to and including the day, a value only with 4 / 14 days of data in it.
import { isoOf } from '../../lib/format.js'
import { dayNo, MIN } from './weight-ma.js'

// 0 steps is no data, as in ptv4's monthly body summary (analyze.py body_m); its steps_avg_7d does count zeros.
export const hasSteps = r => r.steps > 0
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

// The `len` days up to and including day number n: { sum, days } of those with data; null below the minimum.
function windowOf(steps, n, len) {
  const vals = []
  for (let k = 0; k < len; k++) if (steps.has(n - k)) vals.push(steps.get(n - k))
  return vals.length >= MIN[len] ? { sum: vals.reduce((a, b) => a + b, 0), days: vals.length } : null
}
const mean = w => w.sum / w.days

// Sygnał NEAT, always from the 7-day average: yesterday's { avg, base, pct } when each of the last SIGNAL_DAYS
// days has a 7-day average at least `threshold` % under its base, the 28 days before those 7. Else null.
const SIGNAL_DAYS = 5
function neatSignal(steps, today, threshold) {
  const last = dayNo(today) - 1
  const at = n => ({ recent: windowOf(steps, n, 7), prior: windowOf(steps, n - 7, 28) })
  // Sums cross-multiplied, not averages: a quotient can round an exact threshold the wrong way.
  const meets = ({ recent, prior }) => recent && prior && recent.sum * prior.days * 100 <= prior.sum * recent.days * (100 - threshold)
  for (let k = 0; k < SIGNAL_DAYS; k++) if (!meets(at(last - k))) return null
  const { recent, prior } = at(last)
  const avg = mean(recent), base = mean(prior)
  return { avg, base, pct: (avg - base) * 100 / base }
}

// rows: ptv4's body set ({ date, steps }), any length: days before a chart's window feed its first points.
// view: 7 or 28. threshold: the signal's drop in %. today: ISO date, never counted (its steps are not finished).
// { days: [{ d, steps }], line: [{ d, avg }], signal: { avg, base, pct } | null }, oldest first.
export function neatTrend({ rows, view, threshold, today }) {
  const days = rows.filter(r => r.date < today && hasSteps(r)).map(r => ({ d: r.date, steps: r.steps }))
    .sort((a, b) => a.d.localeCompare(b.d))
  const steps = new Map(days.map(r => [dayNo(r.d), r.steps]))
  const line = []
  for (let d = days[0]?.d; d && d < today; d = addDays(d, 1)) {
    const w = windowOf(steps, dayNo(d), view)
    if (w) line.push({ d, avg: mean(w) })
  }
  return { days, line, signal: neatSignal(steps, today, threshold) }
}
