// @vitest-environment happy-dom
// #17: the Trend NEAT card, daily steps as dots and one moving average picked on the card.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from '../../store/useStore.js'
import { isoOf } from '../../lib/format.js'
import { setExt } from '../state.js'
import NeatCard from './NeatCard.jsx'

const days = i => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return isoOf(d) }
// 120 days back, a step up every 10 days, so MA7 and MA28 are different lines.
let rows

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
const button = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text)
const line = host => host.querySelector('svg path[stroke="var(--ext-s1)"]').getAttribute('d')
const linePoints = host => line(host).split(/[ML]/).filter(Boolean).length
const dots = host => host.querySelectorAll('svg circle').length

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 8, 10)) // before noon, by more than the hour the clock change adds: the day 31 days back is inside 1M
  rows = Array.from({ length: 120 }, (_, i) => ({ date: days(120 - i), steps: 6000 + Math.floor(i / 10) * 500 }))
  install(undefined)
})
afterEach(() => {
  act(() => mounted.splice(0).forEach(([root, host]) => { root.unmount(); host.remove() }))
  vi.useRealTimers()
})

describe('Trend NEAT card', () => {
  it('shows MA7 by default', () => {
    const host = render(<NeatCard rows={rows} />)
    expect(host.textContent).toContain('Trend NEAT')
    expect(button(host, 'MA7').getAttribute('aria-pressed')).toBe('true')
  })

  it('switching to MA28 changes the one line and saves the choice in S.ext', () => {
    const host = render(<NeatCard rows={rows} />)
    const ma7 = line(host)
    act(() => button(host, 'MA28').click())
    expect(line(host)).not.toBe(ma7)
    expect(host.querySelectorAll('svg path[fill="none"]')).toHaveLength(1)
    expect(host.querySelector('.ext-legend').textContent).toContain('MA28')
    expect(host.querySelector('.ext-legend').textContent).not.toContain('MA7')
    expect(useStore.getState().S.ext.neatAvg).toBe(28)
    act(() => button(host, 'MA7').click())
    expect(line(host)).toBe(ma7)
  })

  it('reads the saved choice', () => {
    install({ neatAvg: 28 })
    expect(button(render(<NeatCard rows={rows} />), 'MA28').getAttribute('aria-pressed')).toBe('true')
  })

  it('draws the days as dots and uses the saved window of the steps chart', () => {
    install({ chartRange: { steps: '1M' } })
    const host = render(<NeatCard rows={rows} />)
    expect(button(host, '1M').getAttribute('aria-pressed')).toBe('true')
    expect(dots(host)).toBe(31)
    act(() => button(host, '3M').click())
    expect(dots(host)).toBe(92)
    expect(useStore.getState().S.ext.chartRange.steps).toBe('3M')
  })

  it('has a line from the first day of the window, counted from the days before it', () => {
    install({ chartRange: { steps: '1M' } })
    expect(linePoints(render(<NeatCard rows={rows} />))).toBe(31)
  })

  describe('signal', () => {
    // After 10000 a day, 5000 for the last 7 days: 50% down yesterday, the 5th day back 21%.
    const dropped = () => Array.from({ length: 60 }, (_, i) => ({ date: days(60 - i), steps: 60 - i <= 7 ? 5000 : 10000 }))
    const SIGNAL = 'Spadek aktywności: średnia z 7 dni to 5000 kroków, o 50% mniej niż w 28 dniach wcześniej.'

    it('has no line without an active signal', () => {
      expect(render(<NeatCard rows={rows} />).textContent).not.toContain('Spadek aktywności')
    })

    it('has the line with the average and the drop, at 15% when no threshold is saved', () => {
      expect(render(<NeatCard rows={dropped()} />).textContent).toContain(SIGNAL)
    })

    it('keeps the line on MA28', () => {
      const host = render(<NeatCard rows={dropped()} />)
      act(() => button(host, 'MA28').click())
      expect(host.textContent).toContain(SIGNAL)
    })

    it('follows a change of the threshold at once', () => {
      const host = render(<NeatCard rows={dropped()} />)
      act(() => setExt({ neatDropPct: 25 }))
      expect(host.textContent).not.toContain('Spadek aktywności')
      act(() => setExt({ neatDropPct: 20 }))
      expect(host.textContent).toContain(SIGNAL)
    })
  })
})
