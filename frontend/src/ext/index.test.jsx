// @vitest-environment happy-dom
// #18: Trend NEAT on Home, through the same entry point Home.jsx renders.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { isoOf } from '../lib/format.js'
import { ExtHomeCards } from './index.jsx'
import NeatCard from './components/NeatCard.jsx'

const mocks = vi.hoisted(() => ({ st: {} }))
vi.mock('./lib/ptv4.js', async importOriginal => ({ ...await importOriginal(), usePtv4: () => mocks.st }))
vi.mock('./lib/health.js', () => ({ useHealth: () => ({}), problems: () => [] }))

const day = i => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return isoOf(d) }
const body = Array.from({ length: 60 }, (_, i) => ({ date: day(60 - i), steps: 6000 + i * 100 }))
// Every other Home card off: what is left on the page is this card or nothing.
const onlyNeat = (on = true) => ({ layout: { home: ['checks', 'today', 'weight', 'recent'].map(id => ({ id, on: false, tiles: {} })).concat({ id: 'neat', on, tiles: {} }) } })

const mounted = []
function render(node) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push([root, host])
  act(() => root.render(node))
  return host
}
const install = ext => useStore.setState({ S: { ...structuredClone(DEF), ext }, user: null })
const pressed = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text).getAttribute('aria-pressed')

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  mocks.st = { data: { body } }
  install(onlyNeat())
})
afterEach(() => act(() => mounted.splice(0).forEach(([root, host]) => { root.unmount(); host.remove() })))

describe('Trend NEAT on Home', () => {
  it('draws the card with the chart and both switches', () => {
    const host = render(<ExtHomeCards />)
    expect(host.textContent).toContain('Trend NEAT')
    expect(host.querySelector('svg path[stroke="var(--ext-s1)"]')).not.toBeNull()
    expect(pressed(host, 'MA7')).toBe('true')
    expect(pressed(host, '3M')).not.toBeNull()
  })

  it('shares the MA7/MA28 choice with the card in Statystyki+', () => {
    const home = render(<ExtHomeCards />), stats = render(<NeatCard rows={body} />)
    act(() => [...home.querySelectorAll('button')].find(b => b.textContent.trim() === 'MA28').click())
    expect(pressed(stats, 'MA28')).toBe('true')
    expect(useStore.getState().S.ext.neatAvg).toBe(28)
  })

  it('is gone when switched off in Dodatki', () => {
    install(onlyNeat(false))
    expect(render(<ExtHomeCards />).textContent).toBe('')
  })

  it.each([
    ['while loading', { loading: true }],
    ['when the sidecar answers nothing', { error: 'down' }],
    ['with an empty body set', { data: { body: [] } }],
    ['with no steps in it', { data: { body: [{ date: day(2), steps: 0 }, { date: day(1) }] } }],
  ])('is not there %s', (_, st) => {
    mocks.st = st
    expect(render(<ExtHomeCards />).textContent).toBe('')
  })
})
