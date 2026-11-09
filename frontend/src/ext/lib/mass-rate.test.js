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

describe('massRate: the verdict by phase', () => {
  // +2 kg on the last 3 days: MA28 -0.49 a week (-0.56 %), MA7 +0.16 a week.
  const bodyweight = daily().map((b, i, a) => a.length - 1 - i < 3 ? { ...b, w: b.w + 2 } : b)
  const status = (ext, view) => massRate({ bodyweight, view, ext, now: NOW }).status
  const cut = [{ type: 'redukcja', start: ago(30) }], bulk = [{ type: 'masa', start: ago(30) }]

  it('on a redukcja judges the chosen view against 0.5 to 1 % a week by default', () => {
    expect(status({ phases: cut }, 28)).toBe('in')
    expect(status({ phases: cut }, 7)).toBe('slow')
  })

  it('on a masa judges the chosen view against 0.1 to 0.2 kg a week by default', () => {
    expect(status({ phases: bulk }, 7)).toBe('in')
    expect(status({ phases: bulk }, 28)).toBe('slow')
  })

  it('uses the corridor saved for that phase, in its own unit', () => {
    const rateCorridors = { redukcja: { by: 'w', lo: 0.1, hi: 0.3 } }
    expect(status({ phases: cut, rateCorridors }, 28)).toBe('fast')
    expect(status({ phases: bulk, rateCorridors }, 7)).toBe('in')
  })

  it('has no verdict in a deload, even inside a redukcja', () => {
    expect(status({ phases: [...cut, { type: 'deload', start: ago(2), end: ago(0) }] }, 28)).toBeNull()
  })

  it('has no verdict outside a redukcja or a masa', () => {
    expect(status({}, 28)).toBeNull()
    expect(status({ phases: [{ type: 'redukcja', start: ago(30), end: ago(1) }] }, 28)).toBeNull()
    expect(status({ phases: [{ type: 'masa', start: '2026-07-01' }] }, 28)).toBeNull()
  })

  it('has no verdict without a number, but the phase keeps its rate line', () => {
    expect(massRate({ bodyweight: [], view: 7, ext: { phases: cut }, now: NOW }).status).toBeNull()
    expect(massRate({ bodyweight, view: 28, ext: {}, now: NOW }).rate.enough).toBe(true)
  })
})

describe('massRate: the sygnał tempa', () => {
  // Every day for 40 days at `base`, the last 7 days `drop` lower: MA7 now is base - drop, MA7 14 days ago is base.
  const step = (drop, base = 100) => Array.from({ length: 41 }, (_, i) => ({ d: ago(40 - i), w: i > 33 ? base - drop : base }))
  // The drop that makes MA7 fall by exactly `pct` percent of its value now.
  const dropOfPct = (pct, base = 100) => base - base / (1 + pct / 100)
  const cut = [{ type: 'redukcja', start: ago(30) }], bulk = [{ type: 'masa', start: ago(30) }]
  const signal = (bodyweight, ext, view = 7) => massRate({ bodyweight, view, ext, now: NOW }).signal

  it('a redukcja stands when MA7 fell less than 0.2 % in 14 days, or rose', () => {
    expect(signal(step(0.1), { phases: cut })).toBe('stall')
    expect(signal(step(0), { phases: cut })).toBe('stall')
    expect(signal(step(-0.5), { phases: cut })).toBe('stall')
    expect(signal(step(0.3), { phases: cut })).toBeNull()
  })

  it('a fall of exactly the threshold is not a stall', () => {
    expect(signal(step(dropOfPct(0.2)), { phases: cut })).toBeNull()
  })

  it('takes the threshold from the settings', () => {
    expect(signal(step(0.3), { phases: cut, rateStallPct: 0.5 })).toBe('stall')
    expect(signal(step(0.1), { phases: cut, rateStallPct: 0.05 })).toBeNull()
  })

  it('an empty threshold is the default', () => {
    expect(signal(step(0.1), { phases: cut, rateStallPct: null })).toBe('stall')
  })

  it('a redukcja is too fast when the weekly fall over 14 days passes the top of the corridor', () => {
    // 2.1 kg of 97.9 in 14 days: 1.07 % a week, the corridor ends at 1 %.
    expect(signal(step(2.1), { phases: cut })).toBe('cutFast')
    expect(signal(step(dropOfPct(2)), { phases: cut })).toBeNull()
    expect(signal(step(1.5), { phases: cut })).toBeNull()
  })

  it('a masa is too fast when the weekly gain over 14 days passes the top of the corridor', () => {
    // +0.6 kg in 14 days: 0.3 kg a week, the corridor ends at 0.2 kg.
    expect(signal(step(-0.6), { phases: bulk })).toBe('bulkFast')
    expect(signal(step(-0.4), { phases: bulk })).toBeNull()
  })

  it('a corridor in kg compares kg a week, one in % compares % a week', () => {
    // 0.7 kg of 49.3 in 14 days: 0.35 kg a week, but 0.71 % a week.
    const log = step(0.7, 50)
    expect(signal(log, { phases: cut, rateCorridors: { redukcja: { by: 'w', lo: 0.1, hi: 0.5 } } })).toBeNull()
    expect(signal(log, { phases: cut, rateCorridors: { redukcja: { by: '%', lo: 0.1, hi: 0.5 } } })).toBe('cutFast')
  })

  it('a corridor of 0 to 0 is no corridor, so nothing is too fast, and a stall still counts', () => {
    const rateCorridors = { redukcja: { by: '%', lo: 0, hi: 0 }, masa: { by: 'w', lo: 0, hi: 0 } }
    expect(signal(step(5), { phases: cut, rateCorridors })).toBeNull()
    expect(signal(step(-5), { phases: bulk, rateCorridors })).toBeNull()
    expect(signal(step(0.1), { phases: cut, rateCorridors })).toBe('stall')
  })

  it('gives one signal even when a threshold overlaps the corridor', () => {
    expect(signal(step(3), { phases: cut, rateStallPct: 5 })).toBe('cutFast')
  })

  it('a masa has no stall', () => {
    expect(signal(step(0), { phases: bulk })).toBeNull()
  })

  it('does not depend on the view', () => {
    const log = step(2.1), ext = { phases: cut }
    expect([0, 7, 28].map(view => signal(log, ext, view))).toEqual(['cutFast', 'cutFast', 'cutFast'])
  })

  it('has no signal in a deload, even inside a redukcja, or outside the phases', () => {
    expect(signal(step(0), { phases: [...cut, { type: 'deload', start: ago(2), end: ago(0) }] })).toBeNull()
    expect(signal(step(0), {})).toBeNull()
    expect(signal(step(0), { phases: [{ type: 'redukcja', start: ago(30), end: ago(1) }] })).toBeNull()
  })

  it('has no signal without enough data', () => {
    expect(signal(step(0).slice(-10), { phases: cut })).toBeNull()
    expect(signal(step(0).slice(0, -5), { phases: cut })).toBeNull()
    expect(signal([], { phases: cut })).toBeNull()
  })
})
