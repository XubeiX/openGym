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
    expect(ids(layoutOf(ext, 'home'))).toEqual(['weight', 'checks', 'today', 'recent', 'neat'])
  })

  it('keeps a section and a tile switched off', () => {
    let ext = { layout: { home: withSection({}, 'home', 'today', { tiles: { readiness: false } }) } }
    ext = { layout: { home: withSection(ext, 'home', 'recent', { on: false }) } }
    const l = layoutOf(ext, 'home')
    expect(l.find(s => s.id === 'today').tiles).toEqual({ takeaway: true, readiness: false, mass: true, bb: true, goal: true, guard: true, rateSignal: true })
    expect(l.find(s => s.id === 'recent').on).toBe(false)
  })

  it('a section or tile new to the registry joins at the end, switched on; an unknown id is dropped', () => {
    const ext = { layout: { home: [{ id: 'today', on: true, tiles: { mass: false } }, { id: 'gone', on: true, tiles: {} }] } }
    const l = layoutOf(ext, 'home')
    expect(ids(l)).toEqual(['today', 'checks', 'weight', 'recent', 'neat'])
    expect(l[0].tiles).toEqual({ takeaway: true, readiness: true, mass: false, bb: true, goal: true, guard: true, rateSignal: true })
    expect(l[1].on).toBe(true)
  })

  it('Trend NEAT joins a layout saved before it at the end, switched on, the saved order untouched', () => {
    const saved = ['recent', 'weight', 'today', 'checks'].map(id => ({ id, on: id !== 'weight', tiles: {} }))
    const l = layoutOf({ layout: { home: saved } }, 'home')
    expect(ids(l)).toEqual(['recent', 'weight', 'today', 'checks', 'neat'])
    expect(l.map(s => s.on)).toEqual([true, false, true, true, true])
  })

  it('keeps the parts of Statystyki+ in their fixed order and the saved order inside each', () => {
    const saved = ['daily', 'volume', 'recovery', 'strength', 'energy', 'numbers', 'goals'].map(id => ({ id, on: true, tiles: {} }))
    expect(ids(layoutOf({ layout: { stats: saved } }, 'stats'))).toEqual(['numbers', 'recovery', 'energy', 'volume', 'strength', 'goals', 'daily'])
  })

  it('a section new to a part of Statystyki+ joins the end of that part', () => {
    const saved = ['recovery', 'goals', 'strength'].map(id => ({ id, on: true, tiles: {} }))
    expect(ids(layoutOf({ layout: { stats: saved } }, 'stats'))).toEqual(['numbers', 'recovery', 'energy', 'goals', 'strength', 'volume', 'daily'])
  })

  it('reads the Home switches from before the layout', () => {
    const l = layoutOf({ homeWeight: false }, 'home')
    expect(l.find(s => s.id === 'weight').on).toBe(false)
    expect(l.find(s => s.id === 'checks').on).toBe(true)
  })
})
