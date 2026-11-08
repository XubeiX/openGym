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
vi.mock('../lib/ptv4.js', async importOriginal => ({ ...await importOriginal(), usePtv4: sets => ({ data: Object.fromEntries(sets.map(s => [s, mocks.data[s]])), at: Date.now() }) }))
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
function mount(summary, S = {}, guard = []) {
  mocks.data = { kpi: [], energy: [], body: BODY, garmin_kpi: [], garmin_daily: [], readiness: [], lifts: LIFTS, lift_summary: summary, volume: [], goals: [], strength_guard: guard }
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
    expect(tile().querySelector('.v').textContent).toBe('–')
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
  const CUT = { phases: [{ type: 'redukcja', start: ago(30) }], layout: { stats: [{ id: 'strength', on: true }] } }
  const drop = (exercise, change_pct) => ({ exercise, day: 3, avg_e1rm: 120, ref_e1rm: 130, ref_date: '2026-10-18', change_pct, last_date: '2026-11-01' })
  it('lists every active strength drop with the lift and its size', () => {
    mount([row()], { ext: CUT }, [drop('Przysiad (D3)', -7.7), drop('Wiosło', -5)])
    const items = [...host.querySelectorAll('.ext-guard li')].map(li => li.textContent)
    expect(items).toHaveLength(2)
    expect(items[0]).toContain('Przysiad (D3): spadek siły o 7,7%')
    expect(items[1]).toContain('Wiosło: spadek siły o 5%')
  })
  it('shows no bar when nothing dropped', () => {
    mount([row()], { ext: CUT })
    expect(host.querySelector('.ext-guard')).toBeNull()
    expect(host.textContent).not.toContain('nie ma wpisanych faz')
  })
  it('says the guard is off when no phase is set', () => {
    mount([row()])
    expect(host.textContent).toContain('nie ma wpisanych faz')
    expect(host.querySelector('.ext-guard')).toBeNull()
  })
  it('works with no phases set', () => {
    mount([row({ rel8: -2, rel8_txt: '-2,0%' })], { ext: { phases: [] } })
    expect(percent().e1rm[0]).toBe(100)
    expect(tile().querySelector('.v').textContent).toBe('-2,0%')
  })
})
