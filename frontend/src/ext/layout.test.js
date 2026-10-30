import { describe, expect, it } from 'vitest'
import { layoutOf, withSection, REGISTRY } from './layout.js'
import { moved } from '../lib/use-list-reorder.js'

const ids = l => l.map(s => s.id)

describe('layoutOf', () => {
  it('defaults to the registry, everything on', () => {
    const l = layoutOf({}, 'stats')
    expect(ids(l)).toEqual(REGISTRY.stats.map(s => s.id))
    expect(l.every(s => s.on && Object.values(s.tiles).every(Boolean))).toBe(true)
  })

  it('keeps a reordered layout', () => {
    const ext = { layout: { home: moved(layoutOf({}, 'home'), 2, 0) } }
    expect(ids(layoutOf(ext, 'home'))).toEqual(['weight', 'checks', 'today', 'recent'])
  })

  it('keeps a section and a tile switched off', () => {
    let ext = { layout: { home: withSection({}, 'home', 'today', { tiles: { readiness: false } }) } }
    ext = { layout: { home: withSection(ext, 'home', 'recent', { on: false }) } }
    const l = layoutOf(ext, 'home')
    expect(l.find(s => s.id === 'today').tiles).toEqual({ takeaway: true, readiness: false, mass: true, bb: true })
    expect(l.find(s => s.id === 'recent').on).toBe(false)
  })

  it('a section or tile new to the registry joins at the end, switched on; an unknown id is dropped', () => {
    const ext = { layout: { stats: [{ id: 'energy', on: true, tiles: { weight: false } }, { id: 'gone', on: true, tiles: {} }] } }
    const l = layoutOf(ext, 'stats')
    expect(ids(l)).toEqual(['energy', 'numbers', 'recovery', 'strength', 'volume', 'daily'])
    expect(l[0].tiles).toEqual({ tdeeCard: true, weight: false, protein: true })
    expect(l[1].on).toBe(true)
  })

  it('reads the Home switches from before the layout', () => {
    const l = layoutOf({ homeWeight: false }, 'home')
    expect(l.find(s => s.id === 'weight').on).toBe(false)
    expect(l.find(s => s.id === 'checks').on).toBe(true)
  })
})
