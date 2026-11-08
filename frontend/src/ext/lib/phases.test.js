import { describe, expect, it } from 'vitest'
import { phaseError, phaseOn, phaseRuns } from './phases.js'

const masa = (start, end) => ({ type: 'masa', start, ...(end && { end }) })
const redukcja = (start, end) => ({ type: 'redukcja', start, ...(end && { end }) })
const deload = (start, end) => ({ type: 'deload', start, ...(end && { end }) })

describe('phaseError', () => {
  it('wants a start date', () => {
    expect(phaseError({ type: 'masa', start: '' }, [])).toBe('noStart')
  })

  it('refuses an end before the start, takes a one-day phase', () => {
    expect(phaseError(masa('2026-05-10', '2026-05-09'), [])).toBe('endBeforeStart')
    expect(phaseError(masa('2026-05-10', '2026-05-10'), [])).toBe(null)
  })

  it('keeps masa and redukcja apart, a shared day included', () => {
    const others = [redukcja('2026-05-01', '2026-05-31')]
    expect(phaseError(masa('2026-05-31', '2026-06-30'), others)).toBe('overlap')
    expect(phaseError(masa('2026-04-01', '2026-05-01'), others)).toBe('overlap')
    expect(phaseError(masa('2026-06-01', '2026-06-30'), others)).toBe(null)
    expect(phaseError(masa('2026-04-01', '2026-04-30'), others)).toBe(null)
  })

  it('treats a phase with no end as running on, whichever side it is on', () => {
    expect(phaseError(masa('2026-07-01'), [redukcja('2026-05-01')])).toBe('overlap')
    expect(phaseError(masa('2026-04-01'), [redukcja('2026-05-01', '2026-05-31')])).toBe('overlap')
    expect(phaseError(masa('2026-04-01', '2026-04-30'), [redukcja('2026-05-01')])).toBe(null)
  })

  it('lets a deload sit inside masa or redukcja', () => {
    expect(phaseError(deload('2026-05-10', '2026-05-16'), [redukcja('2026-05-01')])).toBe(null)
    expect(phaseError(redukcja('2026-05-01'), [deload('2026-05-10', '2026-05-16')])).toBe(null)
  })
})

describe('phaseOn', () => {
  const today = '2026-11-08'
  const phases = [redukcja('2026-10-01'), deload('2026-10-08', '2026-10-14'), masa('2026-06-01', '2026-06-30')]

  it('names the phase of a day, null outside any', () => {
    expect(phaseOn(phases, '2026-06-30', today)).toBe('masa')
    expect(phaseOn(phases, '2026-07-01', today)).toBe(null)
  })

  it('gives a deload priority over the phase around it', () => {
    expect(phaseOn(phases, '2026-10-07', today)).toBe('redukcja')
    expect(phaseOn(phases, '2026-10-08', today)).toBe('deload')
    expect(phaseOn(phases, '2026-10-15', today)).toBe('redukcja')
  })

  it('runs a phase with no end through today, not past it', () => {
    expect(phaseOn(phases, today, today)).toBe('redukcja')
    expect(phaseOn(phases, '2026-11-09', today)).toBe(null)
  })
})

describe('phaseRuns', () => {
  const noon = day => new Date(day + 'T12:00:00').getTime()
  const today = '2026-11-08'

  it('cuts the window into runs of one phase, a deload splitting what is around it', () => {
    const phases = [redukcja('2026-10-01'), deload('2026-10-08', '2026-10-14')]
    expect(phaseRuns(phases, noon('2026-09-29'), noon('2026-10-20'), today)).toEqual([
      { type: 'redukcja', start: '2026-10-01', end: '2026-10-07' },
      { type: 'deload', start: '2026-10-08', end: '2026-10-14' },
      { type: 'redukcja', start: '2026-10-15', end: '2026-10-20' },
    ])
  })

  it('leaves out what is outside the window and clips what crosses it', () => {
    const phases = [masa('2026-01-01', '2026-02-01'), redukcja('2026-10-01', '2026-10-31')]
    expect(phaseRuns(phases, noon('2026-10-20'), noon('2026-11-05'), today)).toEqual([
      { type: 'redukcja', start: '2026-10-20', end: '2026-10-31' },
    ])
  })

  it('keeps two phases of one type apart when days lie between them', () => {
    const phases = [masa('2026-10-01', '2026-10-02'), masa('2026-10-04', '2026-10-05')]
    expect(phaseRuns(phases, noon('2026-10-01'), noon('2026-10-05'), today)).toEqual([
      { type: 'masa', start: '2026-10-01', end: '2026-10-02' },
      { type: 'masa', start: '2026-10-04', end: '2026-10-05' },
    ])
  })

  it('stops a running phase at today, also on a window reaching further', () => {
    expect(phaseRuns([redukcja('2026-11-01')], noon('2026-11-01'), noon('2026-12-20'), today)).toEqual([
      { type: 'redukcja', start: '2026-11-01', end: today },
    ])
  })

  it('counts every day across a clock change', () => {
    expect(phaseRuns([masa('2026-03-20')], noon('2026-03-20'), noon('2026-04-05'), today)).toEqual([
      { type: 'masa', start: '2026-03-20', end: '2026-04-05' },
    ])
  })

  it('has nothing to draw without phases or with a broken window', () => {
    expect(phaseRuns([], noon('2026-10-01'), noon('2026-10-20'), today)).toEqual([])
    expect(phaseRuns([masa('2026-10-01')], noon('2026-10-01'), NaN, today)).toEqual([])
  })
})
