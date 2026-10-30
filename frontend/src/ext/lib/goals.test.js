import { describe, expect, it } from 'vitest'
import { baseName, goalExercises, openProposals, nearestGoal, inWeeks, withGoal } from './goals.js'

describe('goals', () => {
  it('names a lift once, without the day ptv4 adds for lifts on several days', () => {
    expect(baseName('Martwy Ciąg Rumuński Ze Sztangą (D3)')).toBe('Martwy Ciąg Rumuński Ze Sztangą')
    expect(baseName('Wypychanie (D1) Na Suwnicy')).toBe('Wypychanie (D1) Na Suwnicy')
    expect(goalExercises([{ exercise: 'RDL (D3)' }, { exercise: 'Hack' }, { exercise: 'RDL (D5)' }])).toEqual(['RDL', 'Hack'])
  })

  it('drops proposals for lifts that already have a goal', () => {
    expect(openProposals([{ exercise: 'RDL' }, { exercise: 'Hack' }], [{ name: 'RDL' }])).toEqual([{ exercise: 'Hack' }])
  })

  it('keeps one goal per lift', () => {
    expect(withGoal([{ name: 'RDL', e1rm: 140 }, { name: 'Hack', e1rm: 150 }], { name: 'RDL', e1rm: 145 }))
      .toEqual([{ name: 'Hack', e1rm: 150 }, { name: 'RDL', e1rm: 145 }])
  })

  it('shows the soonest goal not reached yet', () => {
    const rows = [
      { exercise: 'A', deadline: '2027-01-31', status: 'w_tempie', target_e1rm: 150 },
      { exercise: 'B', deadline: '2026-12-01', status: 'osiągnięty', target_e1rm: 100 },
      { exercise: 'C', deadline: '2026-12-15', status: 'zagrożony', target_e1rm: 120 },
    ]
    expect(nearestGoal(rows).exercise).toBe('C')
    expect(nearestGoal([])).toBe(null)
  })

  it('dates a deadline in whole weeks from today', () => {
    expect(inWeeks(10, new Date(2026, 9, 30))).toBe('2027-01-08')
  })
})
