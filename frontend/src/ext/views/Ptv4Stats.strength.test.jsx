// @vitest-environment happy-dom
// Siła on Statystyki+: the percent chart of e1RM and MA7 (window start = 100) and the relative strength tile.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Ptv4Stats from './Ptv4Stats.jsx'

const mocks = vi.hoisted(() => ({ data: null }))
vi.mock('../../store/useStore.js', async () => {
  const { create } = await import('zustand')
  const useStore = create(set => ({ S: { unit: 'kg' }, update: fn => set(st => { const S = { ...st.S }; fn(S); return { S } }) }))
  return { useStore }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/ptv4.js', async importOriginal => ({ ...await importOriginal(), usePtv4: () => ({ data: mocks.data, at: Date.now() }) }))
// what a chart is handed is what it draws; the svg itself needs a measured width
vi.mock('../components/ExtChart.jsx', () => ({ default: ({ unit, series }) => <div className="chart" data-unit={unit} data-series={JSON.stringify(series)} /> }))
import { useStore } from '../../store/useStore.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const ago = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const lift = (n, e1rm, exercise = 'Przysiad') => ({ date: ago(n), exercise, e1rm, pr: false })
const LIFTS = [lift(200, 50), lift(60, 100), lift(20, 120), lift(10, 126), lift(40, 70, 'Wiosło'), lift(10, 90, 'Wiosło')]
// MA7 has no value on the first day: the first point is the first one with a number
const BODY = [[200, 120], [60, null], [59, 95], [25, 80], [10, 76]].map(([n, ma7]) => ({ date: ago(n), ma7 }))
const row = extra => ({ exercise: 'Przysiad', last_txt: '126,0 kg', chg8_txt: '+26,0%', chg8: 26, prs: 1, sessions: 4, ...extra })

let root, host
afterEach(() => { act(() => root.unmount()); host.remove() })
function mount(summary, S = {}) {
  mocks.data = { kpi: [], energy: [], body: BODY, garmin_kpi: [], garmin_daily: [], readiness: [], lifts: LIFTS, lift_summary: summary, volume: [], goals: [] }
  useStore.setState({ S: { unit: 'kg', ext: { layout: { stats: [{ id: 'strength', on: true }] } }, ...S } })
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<Ptv4Stats />))
}
const tile = () => [...host.querySelectorAll('.tile')].find(t => t.querySelector('.l').textContent === 'Siła względna, 8 tygodni')
const percent = () => Object.fromEntries(JSON.parse(host.querySelector('.chart[data-unit="%"]').dataset.series).map(s => [s.key, s.points.map(p => p.y)]))

describe('Statystyki+ Siła: e1RM against body weight', () => {
  it('shows the 8-week change in relative strength from lift_summary', () => {
    mount([row({ rel8: 14.3, rel8_txt: '+14,3%' })])
    expect(tile().querySelector('.v').textContent).toBe('+14,3%')
  })
  it('shows a dash when there is no value', () => {
    mount([row({ rel8: null, rel8_txt: '—' })])
    expect(tile().querySelector('.v').textContent).toBe('—')
  })
  it('shows a dash when the server does not send the value yet', () => {
    mount([row()])
    expect(tile().querySelector('.v').textContent).toBe('—')
  })
  it('draws e1RM and MA7 of the picked exercise as percent, the first point of the window = 100', () => {
    mount([row()])
    const { e1rm, ma7 } = percent()
    expect(e1rm).toEqual([100, 120, 126])
    expect(ma7[0]).toBe(100); expect(ma7[1]).toBeCloseTo(84.21, 2); expect(ma7[2]).toBeCloseTo(80, 5)
  })
  it('recounts the 100 point when the window changes', () => {
    mount([row()])
    const range = host.querySelector('.chart[data-unit="%"]').previousElementSibling
    act(() => [...range.querySelectorAll('button')].find(b => b.textContent === '1M').click())
    const { e1rm, ma7 } = percent()
    expect(e1rm).toEqual([100, 105])
    expect(ma7[0]).toBe(100); expect(ma7[1]).toBeCloseTo(95, 5)
  })
  it('works with no phases set', () => {
    mount([row({ rel8: -2, rel8_txt: '-2,0%' })], { ext: { phases: [] } })
    expect(percent().e1rm[0]).toBe(100)
    expect(tile().querySelector('.v').textContent).toBe('-2,0%')
  })
})
