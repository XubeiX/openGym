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
