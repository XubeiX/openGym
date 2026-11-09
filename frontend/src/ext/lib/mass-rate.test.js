import { describe, expect, it } from 'vitest'
import { weightRate } from '../../lib/bodyweight.js'
import { massRate } from './mass-rate.js'

const NOW = new Date('2026-06-30T12:00:00').getTime()
const ago = n => { const d = new Date(NOW); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// Weigh-ins every day, n days back to today: losing 0.1 kg a day from 90 kg 40 days ago.
const daily = (n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ d: ago(n - i), w: Math.round((86 + (n - i) * 0.1) * 10) / 10 }))

describe('massRate: the weigh-ins view', () => {
  it('is the same 21-day trend as plain Stats', () => {
    const bodyweight = daily()
    expect(massRate({ bodyweight, view: 0, now: NOW }).rate).toEqual(weightRate(bodyweight, { now: NOW }))
    expect(massRate({ bodyweight, view: 0, now: NOW }).rate.perWeek).toBeCloseTo(-0.7, 5)
  })
})

describe('massRate: the average views', () => {
  it('MA7 is its value now minus its value 7 days ago, the percent of the average now', () => {
    // MA7 today 86.3, 7 days ago 87.0.
    const { rate } = massRate({ bodyweight: daily(), view: 7, now: NOW })
    expect(rate.enough).toBe(true)
    expect(rate.perWeek).toBeCloseTo(-0.7, 5)
    expect(rate.pct).toBeCloseTo(-0.7 / 86.3 * 100, 5)
  })

  // The daily log with no weigh-ins from `from` to `to` days ago.
  const without = (from, to) => daily().filter((_, i, a) => { const age = a.length - 1 - i; return age < from || age > to })

  it('takes the newest point at least 7 days old, up to 3 days older', () => {
    // Nothing 7 to 9 days ago: the point 10 days ago is the reference, and MA7 there is 87.3.
    const { rate } = massRate({ bodyweight: without(7, 9), view: 7, now: NOW })
    expect(rate.perWeek).toBeCloseTo(86.3 - 87.3, 5)
  })

  it('without a reference within those 3 days it has no number', () => {
    expect(massRate({ bodyweight: without(7, 10), view: 7, now: NOW }).rate).toEqual({ enough: false })
  })

  it('has no number when the average has gone stale or never started', () => {
    expect(massRate({ bodyweight: without(0, 3), view: 7, now: NOW }).rate).toEqual({ enough: false })
    expect(massRate({ bodyweight: daily(5), view: 7, now: NOW }).rate).toEqual({ enough: false })
    expect(massRate({ bodyweight: [], view: 28, now: NOW }).rate).toEqual({ enough: false })
  })

  it('still counts from the last weigh-in up to 3 days back', () => {
    // Last weigh-in 3 days ago, MA7 there 86.6, reference 7 days before it 87.3.
    expect(massRate({ bodyweight: without(0, 2), view: 7, now: NOW }).rate.perWeek).toBeCloseTo(-0.7, 5)
  })

  it('ignores a weigh-in dated in the future', () => {
    const bodyweight = [...daily(), { d: '2026-07-02', w: 50 }]
    expect(massRate({ bodyweight, view: 7, now: NOW }).rate.perWeek).toBeCloseTo(-0.7, 5)
  })

  it('with regular weigh-ins MA28 matches the "Tempo masy, 28 dni" tile', () => {
    // A jagged log, so the two formulas only meet because the windows do.
    const swing = [0, 0.4, -0.3, 0.2, 0.5, -0.1, 0.3]
    const bodyweight = daily().map((b, i) => ({ ...b, w: b.w + swing[i % 7] }))
    const ma7At = n => bodyweight.slice(bodyweight.length - n - 7, bodyweight.length - n).reduce((s, b) => s + b.w, 0) / 7
    const { rate } = massRate({ bodyweight, view: 28, now: NOW })
    // The tile (analyze.py): the change of MA7 over 28 days, divided by 4.
    expect(rate.perWeek).toBeCloseTo((ma7At(0) - ma7At(28)) / 4, 5)
    expect(rate.pct).toBeCloseTo((ma7At(0) - ma7At(28)) / 4 / ma7At(0) * 100, 1)
  })
})

describe('massRate: the verdict on the manual corridor', () => {
  // +2 kg on the last 3 days: MA28 -0.49 a week, MA7 +0.16 a week.
  const rebound = () => daily().map((b, i, a) => a.length - 1 - i < 3 ? { ...b, w: b.w + 2 } : b)
  const cut = { dir: 'lose', by: 'w', lo: 0.4, hi: 1 }

  it('judges the number of the chosen view', () => {
    const bodyweight = rebound()
    expect(massRate({ bodyweight, view: 28, goal: cut, now: NOW }).status).toBe('in')
    expect(massRate({ bodyweight, view: 7, goal: cut, now: NOW }).status).toBe('slow')
  })

  it('has no verdict without a corridor or a number', () => {
    expect(massRate({ bodyweight: daily(), view: 7, now: NOW }).status).toBeNull()
    expect(massRate({ bodyweight: [], view: 7, goal: cut, now: NOW }).status).toBeNull()
  })
})
