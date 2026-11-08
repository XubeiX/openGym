import { describe, expect, it } from 'vitest'
import { guardLifts, guardOptions, flipLift, withThreshold } from './guard.js'

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
