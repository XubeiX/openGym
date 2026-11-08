import { describe, expect, it } from 'vitest'
import { guardLine } from './guard.js'

const drop = (exercise, change_pct) => ({ exercise, change_pct })

describe('guardLine', () => {
  it('is empty with no active strength drop', () => {
    expect(guardLine([])).toBeNull()
  })

  it('names the lift and the size of a single drop, with no count', () => {
    expect(guardLine([drop('Przysiad Hack (D3)', -7.7)])).toBe('Przysiad Hack (D3): spadek siły o 7,7%')
  })

  it('picks the most serious drop whatever the order, and counts the others', () => {
    const rows = [drop('Wiosło', -5), drop('Przysiad Hack (D3)', -7.7), drop('Ławka (D1)', -6.1)]
    expect(guardLine(rows)).toBe('Przysiad Hack (D3): spadek siły o 7,7% (pozostałe: 2)')
  })
})
