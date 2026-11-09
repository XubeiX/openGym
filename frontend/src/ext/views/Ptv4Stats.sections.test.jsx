// @vitest-environment happy-dom
// Statystyki+ in four parts under a sticky bar: what the bar offers, where a tap lands, what a link opens.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Ptv4Stats from './Ptv4Stats.jsx'

const mocks = vi.hoisted(() => ({ S: null }))
vi.mock('../../store/useStore.js', () => ({ useStore: selector => selector({ S: mocks.S }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
// every ptv4 data set is there and empty
vi.mock('../lib/ptv4.js', async original => ({
  ...await original(), usePtv4: () => ({ data: new Proxy({}, { get: () => [] }) }),
}))
vi.mock('../../sheets.jsx', () => ({
  bwSheet: () => {}, goalSheet: () => {}, calendarSheet: () => {}, workoutDetailSheet: () => {}, exerciseHistorySheet: () => {},
  WorkoutRow: () => null, bwDeltaColor: () => 'inherit',
}))
vi.mock('../../components/LineChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/Heatmap.jsx', () => ({ default: () => null }))
vi.mock('../../components/BodyMap.jsx', () => ({ default: () => null, BodyMapLegend: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
afterEach(() => { act(() => root.unmount()); host.remove(); window.history.replaceState(null, '', '#/') })
function mount(layout = []) {
  mocks.S = { unit: 'kg', ext: { layout: { stats: layout } } }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<Ptv4Stats />))
}
const bar = () => [...host.querySelectorAll('.stats-index .seg button')]
const labels = () => bar().map(b => b.textContent)
const headings = el => [...el.querySelectorAll('.ext-sec')].map(h => h.textContent)
const off = (...ids) => ids.map(id => ({ id, on: false }))

describe('Dzień po dniu', () => {
  beforeEach(() => { globalThis.ResizeObserver = class { observe() {} disconnect() {} } })
  const titles = () => [...host.querySelectorAll('#stats-days h2:not(.ext-sec)')].map(h => h.textContent)
  it('has the Trend NEAT card where the steps chart was', () => {
    mount()
    expect(titles()).toEqual(['Sen dziennie', 'Trend NEAT'])
  })
  it('keeps the card off when the steps tile was switched off', () => {
    mount([{ id: 'daily', on: true, tiles: { steps: false } }])
    expect(titles()).toEqual(['Sen dziennie'])
  })
})

describe('Statystyki+ bar', () => {
  it('offers the four parts, each holding its sections', () => {
    mount()
    expect(labels()).toEqual(['Liczby', 'Ciało', 'Siła', 'Dni'])
    expect([...host.querySelectorAll('.stats-sect')].map(headings)).toEqual([
      ['Liczby'], ['Masa i energia', 'Regeneracja'], ['Siła', 'Cele', 'Objętość'], ['Dzień po dniu'],
    ])
  })
  it('drops a part with no section switched on', () => {
    mount(off('energy', 'recovery'))
    expect(labels()).toEqual(['Liczby', 'Siła', 'Dni'])
    expect(host.querySelector('#stats-body')).toBeNull()
  })
  it('keeps a part while one of its sections is on', () => {
    mount(off('energy'))
    expect(labels()).toEqual(['Liczby', 'Ciało', 'Siła', 'Dni'])
  })
  it('treats the first visible part as the top of the page, also without Liczby', () => {
    window.history.replaceState(null, '', '#/ptv4?section=strength')
    mount(off('numbers'))
    window.scrollTo = vi.fn()
    expect(labels()).toEqual(['Ciało', 'Siła', 'Dni'])
    act(() => bar()[0].click())
    expect(bar()[0].getAttribute('aria-pressed')).toBe('true')
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(window.location.hash).toBe('#/ptv4')
  })
  it('a tap marks the part, scrolls to it and puts it in the address', () => {
    window.history.replaceState(null, '', '#/ptv4')
    mount()
    const into = vi.fn()
    host.querySelector('#stats-strength').scrollIntoView = into
    act(() => bar()[2].click())
    expect(bar()[2].getAttribute('aria-pressed')).toBe('true')
    expect(into).toHaveBeenCalled()
    expect(window.location.hash).toBe('#/ptv4?section=strength')
  })
  it('opens on the part a link names', () => {
    window.history.replaceState(null, '', '#/ptv4?section=days')
    mount()
    expect(bar()[3].getAttribute('aria-pressed')).toBe('true')
  })
  it('moves the highlight with the scroll', async () => {
    window.history.replaceState(null, '', '#/ptv4')
    mount()
    expect(bar()[0].getAttribute('aria-pressed')).toBe('true')
    // here every part sits at the top of the page, so the last one has reached the line
    await act(async () => { window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 60)) })
    expect(bar()[3].getAttribute('aria-pressed')).toBe('true')
  })
})
