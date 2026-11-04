import { describe, expect, it } from 'vitest'
import { coachTipFor } from './coach-tips.js'

const notes = { A: { at: 1000, ex: { '0025': ' 47,5 × 10/10/9 ', '0031': '' } } }

describe('coach tips', () => {
  it('shows the suggestion until a workout of that routine starts after it', () => {
    const S = { extCoachNotes: notes, workouts: [{ routineIds: ['A'], start: 500 }] }
    expect(coachTipFor(S, 'A', '0025')).toBe('47,5 × 10/10/9')
    S.workouts.push({ routineIds: ['A'], start: 2000 })
    expect(coachTipFor(S, 'A', '0025')).toBeNull()
  })

  it('reads the routine of a workout logged before routineIds', () => {
    expect(coachTipFor({ extCoachNotes: notes, workouts: [{ routineId: 'A', start: 2000 }] }, 'A', '0025')).toBeNull()
  })

  it('is not used up by another routine, and comes back with a newer one', () => {
    const S = { extCoachNotes: notes, workouts: [{ routineIds: ['B'], start: 2000 }] }
    expect(coachTipFor(S, 'A', '0025')).toBe('47,5 × 10/10/9')
    expect(coachTipFor(S, 'B', '0025')).toBeNull()
    S.workouts.push({ routineIds: ['A'], start: 2000 })
    S.extCoachNotes = { A: { at: 3000, ex: { '0025': 'nowa' } } }
    expect(coachTipFor(S, 'A', '0025')).toBe('nowa')
  })

  it('has nothing for an empty text, another exercise, no notes or an edited workout', () => {
    expect(coachTipFor({ extCoachNotes: notes }, 'A', '0031')).toBeNull()
    expect(coachTipFor({ extCoachNotes: notes }, 'A', '9999')).toBeNull()
    expect(coachTipFor({}, 'A', '0025')).toBeNull()
    expect(coachTipFor({ extCoachNotes: notes, active: { editingWorkoutId: 'w1' } }, 'A', '0025')).toBeNull()
  })
})
