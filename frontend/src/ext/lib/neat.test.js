import { describe, expect, it } from 'vitest'
import { neatTrend } from './neat.js'

const row = (date, steps) => ({ date, steps })
const nov = (day, steps) => row(`2026-11-${String(day).padStart(2, '0')}`, steps)
const week = [1, 2, 3, 4, 5, 6, 7].map(d => nov(d, d * 1000))

describe('neatTrend', () => {
  it('MA7 averages the last 7 calendar days and starts at 4 days of data', () => {
    const { line } = neatTrend({ rows: week, view: 7, today: '2026-11-08' })
    expect(line).toEqual([
      { d: '2026-11-04', avg: 2500 }, { d: '2026-11-05', avg: 3000 },
      { d: '2026-11-06', avg: 3500 }, { d: '2026-11-07', avg: 4000 },
    ])
  })

  it('leaves out today, whose count is not finished', () => {
    const { days, line } = neatTrend({ rows: [...week, nov(8, 500)], view: 7, today: '2026-11-08' })
    expect(days.at(-1)).toEqual({ d: '2026-11-07', steps: 7000 })
    expect(line.at(-1)).toEqual({ d: '2026-11-07', avg: 4000 })
  })

  it('takes a day with no steps or zero steps as a day without data', () => {
    const rows = [nov(1, 1000), nov(2, 2000), nov(3, 3000), nov(4, 0), nov(5, null)]
    const { days, line } = neatTrend({ rows, view: 7, today: '2026-11-08' })
    expect(days.map(r => r.d)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
    expect(line).toEqual([])
  })

  it('MA28 starts at 14 days of data and lasts while 14 are in the window', () => {
    // 11 to 24 Oct, 1000 to 14000 steps: 14 days, mean 7500. 11 Oct leaves the window after 7 Nov.
    const rows = Array.from({ length: 14 }, (_, i) => row(`2026-10-${11 + i}`, (i + 1) * 1000))
    const { line } = neatTrend({ rows, view: 28, today: '2026-11-10' })
    expect(line[0]).toEqual({ d: '2026-10-24', avg: 7500 })
    expect(line.at(-1)).toEqual({ d: '2026-11-07', avg: 7500 })
    expect(line).toHaveLength(15)
  })

  it('MA7 goes on over a gap and stops when fewer than 4 days are left in the window', () => {
    const rows = [nov(1, 1000), nov(2, 2000), nov(3, 3000), nov(4, 6000)]
    const { line } = neatTrend({ rows, view: 7, today: '2026-11-10' })
    expect(line).toEqual(['04', '05', '06', '07'].map(d => ({ d: `2026-11-${d}`, avg: 3000 })))
  })

  it('counts days before a chart window into the first point of that window', () => {
    // A chart showing November still gets 31 Oct to 1 Nov averaged from October's days.
    const rows = [row('2026-10-26', 1000), row('2026-10-27', 2000), row('2026-10-28', 3000), row('2026-10-29', 4000), nov(1, 10000)]
    const { line } = neatTrend({ rows, view: 7, today: '2026-11-08' })
    expect(line.find(p => p.d === '2026-11-01')).toEqual({ d: '2026-11-01', avg: 4000 })
  })

  it('sorts rows that come out of order', () => {
    const { days } = neatTrend({ rows: [nov(3, 3), nov(1, 1), nov(2, 2)], view: 7, today: '2026-11-08' })
    expect(days.map(r => r.steps)).toEqual([1, 2, 3])
  })
})

describe('neatTrend signal', () => {
  const TODAY = '2026-11-08'
  const ago = i => new Date(Date.UTC(2026, 10, 8 - i)).toISOString().slice(0, 10)
  // steps(i): the steps i days back from TODAY (1 = yesterday), null for a day without data.
  const history = (steps, days = 60) => Array.from({ length: days }, (_, k) => row(ago(k + 1), steps(k + 1)))
  const signal = (rows, threshold = 15, view = 7, today = TODAY) => neatTrend({ rows, view, threshold, today }).signal

  // Yesterday's 7 days add up to 59500 (avg 8500) against 10000 before them; the 4 days before yesterday are lower still.
  const exactly15 = history(i => i <= 4 ? 12625 : i <= 7 ? 3000 : 10000)

  it('is active at exactly the threshold and gives the average, the reference and the change', () => {
    const s = signal(exactly15, 15)
    expect(s).toEqual({ avg: 8500, base: 10000, pct: -15 })
  })

  it('is off when the drop is smaller than the threshold', () => {
    expect(signal(exactly15, 20)).toBeNull()
  })

  // 5000 for the last 7 days after 10000: the 7-day average is 50, 43, 36, 29, 21, 14 and 7% under the
  // reference going back from yesterday.
  const dropped = history(i => i <= 7 ? 5000 : 10000)

  it('needs 5 days in a row that meet the threshold, ending yesterday', () => {
    expect(signal(dropped, 15)).toEqual({ avg: 5000, base: 10000, pct: -50 }) // 5 days
    expect(signal(dropped, 25)).toBeNull() // 4 days
  })

  it('is broken by a day without a 7-day average', () => {
    // Without the 3rd day back, that day has only 3 days of data in its 7 (4, 5 and 6 back); the other four keep at least 4.
    const missing = [7, 8, 9]
    const steps = gap => i => missing.includes(i) || i === gap ? null : i <= 11 ? 1000 : 10000
    expect(signal(history(steps()))).not.toBeNull()
    expect(signal(history(steps(3)))).toBeNull()
  })

  it('is not broken by a day without steps while the average still has its 4 days', () => {
    expect(signal(history(i => i === 2 ? null : i <= 7 ? 5000 : 10000))).toEqual({ avg: 5000, base: 10000, pct: -50 })
  })

  it('needs 14 days of data in the reference of each of the 5 days', () => {
    // The oldest of the 5 days, 5 back, has its reference from 12 back on: 14 days of it take the history to 25 back.
    const steps = i => i <= 7 ? 1000 : 10000
    expect(signal(history(steps, 25))).not.toBeNull()
    expect(signal(history(steps, 24))).toBeNull()
  })

  it('needs a history at all', () => {
    expect(signal([])).toBeNull()
  })

  it('goes away once the average is back above the threshold', () => {
    const tomorrow = '2026-11-09'
    expect(signal([...dropped, row(TODAY, 1000)], 15, 7, tomorrow)).not.toBeNull()
    expect(signal([...dropped, row(TODAY, 40000)], 15, 7, tomorrow)).toBeNull()
  })

  it('does not count today', () => {
    expect(signal([...dropped, row(TODAY, 40000)])).toEqual({ avg: 5000, base: 10000, pct: -50 })
  })

  it('is the same for MA7 and MA28 on the chart', () => {
    expect(signal(dropped, 15, 28)).toEqual(signal(dropped, 15, 7))
  })
})
