// @vitest-environment happy-dom
// #12, #13: the mass rate line on the fork's weight card follows the Ważenia / MA7 / MA28 switch and the phase.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { isoOf } from '../../lib/format.js'
import WeightCard from './WeightCard.jsx'

const nav = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async orig => ({ ...await orig(), useNavigate: () => nav }))

const mounted = []
function render(node) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push([root, host])
  act(() => root.render(node))
  return host
}
const days = i => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return isoOf(d) }
// Losing 0.1 kg a day for 40 days, with +2 kg on the last 3 days. Trend over 21 days, MA7 and MA28 all differ.
const log = Array.from({ length: 41 }, (_, i) => ({ d: days(i), w: Math.round((86 + i * 0.1 + (i < 3 ? 2 : 0)) * 10) / 10, t: 1 })).reverse()
const install = patch => useStore.setState({ S: { ...structuredClone(DEF), unit: 'kg', bodyweight: log, ...patch }, user: null })
const line = host => host.querySelector('.bw-rate').textContent
const verdict = host => host.querySelector('.bw-rate b')?.textContent
const pick = (host, text) => act(() => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text).click())

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toast: vi.fn() })
  nav.mockClear()
  install({})
})
afterEach(() => { act(() => mounted.splice(0).forEach(([root, host]) => { root.unmount(); host.remove() })) })

describe('mass rate on the weight card', () => {
  it('changes with the view', () => {
    const host = render(<WeightCard />)
    const weighIns = line(host)
    expect(weighIns).toMatch(/Tempo [-+]\d/)
    pick(host, 'MA7')
    expect(line(host)).toContain('Tempo +0,16 kg na tydzień')
    pick(host, 'MA28')
    expect(line(host)).toContain('Tempo -0,49 kg na tydzień')
    pick(host, 'Ważenia')
    expect(line(host)).toBe(weighIns)
  })

  it('says there are too few weigh-ins instead of guessing', () => {
    install({ bodyweight: log.slice(-5), ext: { weightAvg: 7 } })
    expect(line(render(<WeightCard />))).toContain('Za mało ważeń')
  })

  it('judges the number of the chosen view against the corridor of the running phase', () => {
    // MA28 -0.49 kg a week, about -0.56 %; MA7 +0.16 kg a week. The default corridor of a redukcja is 0.5 to 1 %.
    install({ ext: { weightAvg: 28, phases: [{ type: 'redukcja', start: days(30) }] } })
    const host = render(<WeightCard />)
    expect(verdict(host)).toBe('W normie')
    pick(host, 'MA7')
    expect(verdict(host)).toBe('Za wolno')
  })

  it('shows the rate alone without a phase, whatever the manual corridor says', () => {
    install({ rateGoal: { dir: 'lose', by: 'w', lo: 0.4, hi: 1 }, ext: { weightAvg: 28 } })
    const host = render(<WeightCard />)
    expect(line(host)).toContain('Tempo -0,49 kg na tydzień')
    expect(verdict(host)).toBeUndefined()
  })

  it('tapping the line leads to the corridor settings, and no manual corridor opens', () => {
    const host = render(<WeightCard />)
    act(() => host.querySelector('.bw-rate').click())
    expect(nav).toHaveBeenCalledWith('/settings/ext', { state: { find: 'Korytarz redukcji' } })
    expect(useUI.getState().sheets).toHaveLength(0)
  })
})
