// @vitest-environment happy-dom
// The layout editor moves a Statystyki+ section only inside its part.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExtSettings from './ExtSettings.jsx'
import { layoutOf } from '../layout.js'
import { L } from '../strings.js'

const mocks = vi.hoisted(() => ({ S: null, render: null }))
vi.mock('../../store/useStore.js', () => {
  const useStore = selector => selector({ S: mocks.S })
  useStore.getState = () => ({ update: fn => { fn(mocks.S); mocks.render() } })
  return { useStore }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
afterEach(() => { act(() => root.unmount()); host.remove() })
function mount() {
  mocks.S = { unit: 'kg', workouts: [], routines: [], bodyweight: [], ext: {} }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  mocks.render = () => root.render(<ExtSettings key={JSON.stringify(mocks.S.ext)} />)
  act(() => mocks.render())
}
const handle = name => host.querySelector(`[aria-label="${L.moveSection(name)}"]`)
const press = (name, key) => act(() => handle(name).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })))
const order = () => layoutOf(mocks.S.ext, 'stats').map(s => s.id)
const start = ['numbers', 'energy', 'recovery', 'strength', 'goals', 'volume', 'daily']

describe('Home layout editor', () => {
  const homeOrder = () => layoutOf(mocks.S.ext, 'home').map(s => s.id)
  it('moves Trend NEAT like any other card', () => {
    mount()
    press('Trend NEAT', 'ArrowUp')
    expect(homeOrder()).toEqual(['checks', 'today', 'weight', 'neat', 'recent'])
  })
  it('switches Trend NEAT off and on', () => {
    mount()
    const flip = () => act(() => host.querySelector('[aria-label="Trend NEAT"]').click())
    const on = () => layoutOf(mocks.S.ext, 'home').find(s => s.id === 'neat').on
    flip()
    expect(on()).toBe(false)
    flip()
    expect(on()).toBe(true)
  })
})

describe('Statystyki+ layout editor', () => {
  it('moves a section inside its part', () => {
    mount()
    press('Regeneracja', 'ArrowUp')
    expect(order()).toEqual(['numbers', 'recovery', 'energy', 'strength', 'goals', 'volume', 'daily'])
  })
  it('does not move a section out of its part', () => {
    mount()
    press('Regeneracja', 'ArrowDown')
    press('Siła', 'ArrowUp')
    expect(order()).toEqual(start)
  })
  it('offers no handle on a section alone in its part', () => {
    mount()
    expect(handle('Liczby')).toBeNull()
    expect(handle('Dzień po dniu')).toBeNull()
  })
})
