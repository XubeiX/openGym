import { describe, expect, it } from 'vitest'
import { missingChecks } from './checks.js'

const CM = ['Kcal zjedzone', 'Białko (g)', 'Tłuszcz (g)', 'Węglowodany (g)', 'Sen (h)', 'Kroki', 'Kcal spalone']
  .map((name, i) => ({ id: 'c' + i, name }))
const day = (d, values, extra = {}) => ({ d, ...extra, other: Object.entries(values).map(([name, value]) => ({ id: CM.find(c => c.name === name).id, name, value })) })
const FULL = { 'Kcal zjedzone': 2800, 'Białko (g)': 180, 'Tłuszcz (g)': 80, 'Węglowodany (g)': 330 } // 4·180+4·330+9·80 = 2760, 99%
// Thursday 29 Oct 2026
const at = h => new Date(2026, 9, 29, h, 0)
const state = (measurements, bodyweight = [{ d: '2026-10-29', w: 84 }]) => ({ customMeasurements: CM, bodyweight, measurements })
const ids = (S, h = 12, ext) => missingChecks(S, at(h), ext).map(x => x.id)
const full = () => state([day('2026-10-28', FULL), day('2026-10-29', { 'Sen (h)': 7.5 })])

describe('missingChecks', () => {
  it('a full day: nothing missing', () => {
    expect(ids(full())).toEqual([])
  })

  it('no weigh-in today, on the listed weekdays after the hour only', () => {
    const S = { ...full(), bodyweight: [] }
    expect(ids(S)).toEqual(['weigh'])
    expect(ids(S, 5)).toEqual([])
    expect(ids(S, 12, { checks: { weigh: { days: [1, 2] } } })).toEqual([]) // Thursday is 4
  })

  it("yesterday's kcal and macros, naming the gaps", () => {
    const S = state([day('2026-10-28', { 'Kcal zjedzone': 2800 }), day('2026-10-29', { 'Sen (h)': 7 })])
    expect(missingChecks(S, at(12))).toEqual([{ id: 'food', day: '2026-10-28', action: 'log', detail: 'Białko (g), Tłuszcz (g), Węglowodany (g)' }])
  })

  it('an incomplete Fitatu log: macros worth 65% of the kcal flag it, 75% does not', () => {
    const log = pct => state([day('2026-10-28', { ...FULL, 'Kcal zjedzone': Math.round(2760 / pct) }), day('2026-10-29', { 'Sen (h)': 7 })])
    expect(ids(log(0.65))).toEqual(['fitatu'])
    expect(ids(log(0.75))).toEqual([])
  })

  it("no sleep from last night counts only from 10:00", () => {
    const S = state([day('2026-10-28', FULL)])
    expect(ids(S, 9)).toEqual([])
    expect(ids(S, 10)).toEqual(['sleep'])
  })

  it('steps and kcal burnt are off unless switched on', () => {
    expect(ids(full())).toEqual([])
    expect(ids(full(), 12, { checks: { burn: { on: true } } })).toEqual(['burn'])
  })

  it('waist every 7 days: 6 days ago is fine, 8 days ago is due; or on a weekday', () => {
    const withWaist = d => { const S = full(); S.measurements.push({ d, waist: 80, other: [] }); return S }
    const on = { checks: { waist: { on: true } } }
    expect(ids(withWaist('2026-10-23'), 12, on)).toEqual([])
    expect(ids(withWaist('2026-10-21'), 12, on)).toEqual(['waist'])
    expect(ids(full(), 12, { checks: { waist: { on: true, everyDays: 0, days: [4] } } })).toEqual(['waist'])
    expect(ids(full(), 12, { checks: { waist: { on: true, everyDays: 0, days: [1] } } })).toEqual([])
  })

  it('snoozed until tomorrow: hidden today, back the next day', () => {
    const S = { ...full(), bodyweight: [] }
    expect(ids(S, 12, { snooze: '2026-10-29' })).toEqual([])
    expect(missingChecks(S, new Date(2026, 9, 30, 12), { snooze: '2026-10-29' }).map(x => x.id)).toContain('weigh')
  })

  it('a role can read another field', () => {
    const S = full()
    S.customMeasurements = [...CM, { id: 'z', name: 'Sleep' }]
    S.measurements[1] = { d: '2026-10-29', other: [{ id: 'z', name: 'Sleep', value: 7 }] }
    expect(ids(S)).toEqual(['sleep'])
    expect(ids(S, 12, { fields: { sleep: 'Sleep' } })).toEqual([])
  })

  it('a field the profile does not have is not asked for', () => {
    const S = { ...full(), customMeasurements: CM.filter(c => c.name !== 'Białko (g)') }
    S.measurements[0] = day('2026-10-28', { 'Kcal zjedzone': 2800 })
    expect(missingChecks(S, at(12))[0].detail).toBe('Tłuszcz (g), Węglowodany (g)')
  })
})
