import { describe, expect, it } from 'vitest'
import { recentMeasurementDays } from './measurements.js'

describe('recentMeasurementDays', () => {
  const entry = (d, value) => ({ d, other: [{ id: 'kcal', name: 'Kcal', value }] })

  it('lists the last days today first, gaps included', () => {
    const days = recentMeasurementDays({ measurements: [entry('2026-10-21', 2881), entry('2026-10-23', 1200)] }, '2026-10-23', 3)
    expect(days.map(x => x.d)).toEqual(['2026-10-23', '2026-10-22', '2026-10-21'])
    expect(days.map(x => x.entry?.other[0].value ?? null)).toEqual([1200, null, 2881])
  })

  it('crosses a month boundary', () => {
    const days = recentMeasurementDays({ measurements: [entry('2026-10-01', 1)] }, '2026-10-02', 3)
    expect(days.map(x => x.d)).toEqual(['2026-10-02', '2026-10-01', '2026-09-30'])
  })

  it('stays empty without anything logged in the last 14 days', () => {
    expect(recentMeasurementDays({ measurements: [entry('2026-10-01', 2000)] }, '2026-10-23')).toEqual([])
    expect(recentMeasurementDays({ measurements: [entry('2026-10-22', null)] }, '2026-10-23')).toEqual([])
    expect(recentMeasurementDays({}, '2026-10-23')).toEqual([])
  })
})
