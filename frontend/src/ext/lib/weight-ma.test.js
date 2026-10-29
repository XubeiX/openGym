import { describe, expect, it } from 'vitest'
import { weightMA } from './weight-ma.js'

// The same weigh-ins and expected MA as ptv4-skill/scripts/test_analyze.py (weight_daily_rows).
const WEIGH_INS = {
  '2026-09-01': 84.8, '2026-09-02': 84.6, '2026-09-03': 84.9, '2026-09-06': 84.8, '2026-09-07': 84.6,
  '2026-09-08': 84.4, '2026-09-09': 84.7, '2026-09-10': 84.5, '2026-09-14': 84.2, '2026-09-15': 84.5,
  '2026-09-16': 84.3, '2026-09-17': 84.1, '2026-09-18': 84.4, '2026-09-19': 84.2, '2026-09-21': 84.3,
  '2026-09-22': 84.1, '2026-09-23': 83.9, '2026-09-24': 84.2, '2026-09-25': 84.0, '2026-09-26': 83.8,
  '2026-09-27': 84.1, '2026-09-28': 83.9, '2026-09-29': 83.7, '2026-09-30': 84.0,
}
const EXPECTED = {
  '2026-09-03': [null, null], '2026-09-06': [84.78, null], '2026-09-14': [84.45, null],
  '2026-09-18': [84.3, null], '2026-09-19': [84.28, 84.5], '2026-09-30': [83.96, 84.25],
}

describe('weightMA', () => {
  const rows = weightMA(Object.entries(WEIGH_INS).reverse().map(([d, w]) => ({ d, w, t: 1 })))
  it('matches ptv4 day by day, minimums and gaps included', () => {
    expect(rows.map(r => r.d)).toEqual(Object.keys(WEIGH_INS))
    for (const [d, [ma7, ma28]] of Object.entries(EXPECTED)) {
      const r = rows.find(x => x.d === d)
      // ptv4 rounds to 2 places; an exact half (84.775) may land either side in floating point
      const near = (v, want) => want == null ? expect(v).toBeNull() : expect(Math.abs(v - want)).toBeLessThanOrEqual(0.0051)
      near(r.ma7, ma7)
      near(r.ma28, ma28)
    }
  })
  it('skips entries without a weight', () => {
    expect(weightMA([{ d: '2026-09-01', w: 0 }, { w: 80 }, null])).toEqual([])
  })
})
