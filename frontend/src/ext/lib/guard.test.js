import { describe, expect, it } from 'vitest'
import { guardLine, guardLifts, guardOptions, flipLift, withThreshold } from './guard.js'

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

describe('strength guard settings', () => {
  it('starts with the default lifts, the same names as opengym.GUARD_LIFTS in ptv4', () => {
    expect(guardLifts({})).toEqual(['Podciąganie Nachwytem Z Obciążeniem', 'Wyciskanie Sztangi Na Ławce Płaskiej', 'Wyciskanie Żołnierskie Sztangi Stojąc', 'Przysiad Hack Na Maszynie', 'Martwy Ciąg Rumuński Ze Sztangą'])
  })

  it('takes a saved list as it is, also an empty one', () => {
    expect(guardLifts({ strengthGuard: { lifts: ['RDL'] } })).toEqual(['RDL'])
    expect(guardLifts({ strengthGuard: { lifts: [] } })).toEqual([])
    expect(guardLifts({ strengthGuard: { threshold: 7 } })).toHaveLength(5)
  })

  it('offers each active lift once without the plan day, and keeps a picked lift that is no longer active', () => {
    expect(guardOptions([{ exercise: 'RDL (D3)' }, { exercise: 'Hack' }, { exercise: 'RDL (D5)' }], ['Hack', 'Stary'])).toEqual(['RDL', 'Hack', 'Stary'])
    expect(guardOptions(undefined, ['Hack'])).toEqual(['Hack'])
  })

  it('flips a lift on and off', () => {
    expect(flipLift(['RDL', 'Hack'], 'RDL')).toEqual(['Hack'])
    expect(flipLift(['Hack'], 'RDL')).toEqual(['Hack', 'RDL'])
  })

  it('stores the threshold next to the list, and drops it when the field is cleared', () => {
    expect(withThreshold({ lifts: ['RDL'] }, 7.5)).toEqual({ lifts: ['RDL'], threshold: 7.5 })
    expect(withThreshold({ lifts: ['RDL'], threshold: 7 }, null)).toEqual({ lifts: ['RDL'] })
    expect(withThreshold(undefined, 3)).toEqual({ threshold: 3 })
  })
})
