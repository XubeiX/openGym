// @vitest-environment happy-dom
// Home's "Dziś": the strength guard's line.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TodayCard from './TodayCard.jsx'

const mocks = vi.hoisted(() => ({ guard: [] }))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/ptv4.js', async importOriginal => ({ ...await importOriginal(), usePtv4: () => ({ data: { kpi: [{ takeaway: 'ok' }], garmin_kpi: [], goals: [], strength_guard: mocks.guard } }) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, host
afterEach(() => { act(() => root.unmount()); host.remove() })
function mount(guard, tiles) {
  mocks.guard = guard
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<TodayCard tiles={tiles} />))
}
const DROP = { exercise: 'Przysiad Hack (D3)', change_pct: -7.7 }

describe('TodayCard: strength guard line', () => {
  it('shows the line with an active drop', () => {
    mount([DROP])
    expect(host.textContent).toContain('Przysiad Hack (D3): spadek siły o 7,7%')
  })
  it('has no line without one', () => {
    mount([])
    expect(host.textContent).not.toContain('spadek siły')
  })
  it('has no line when switched off in the layout', () => {
    mount([DROP], { guard: false })
    expect(host.textContent).not.toContain('spadek siły')
  })
})
