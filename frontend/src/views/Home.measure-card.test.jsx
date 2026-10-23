// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { isoOf, todayISO } from '../lib/format.js'
import { measurementLogSheet } from './Measurements.jsx'
import Home from './Home.jsx'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', confirmSheet: vi.fn(),
}))
vi.mock('./Measurements.jsx', async orig => ({ ...(await orig()), measurementLogSheet: vi.fn() }))

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks() })

const mountWith = measurements => {
  useStore.setState(s => ({
    S: {
      ...s.S, routines: [], workouts: [], bodyweight: [], dayPlan: {}, week: {}, active: null,
      measurementEnabled: [], customMeasurements: [{ id: 'kcal', name: 'Kcal', enabled: true }], measurements,
    },
    user: null,
  }))
  act(() => root.render(<Home />))
}
const rows = () => [...host.querySelectorAll('.measure-day')]

describe('Home measurements card', () => {
  it('lists the last five days, gaps included, and opens the tapped day', () => {
    mountWith([{ d: todayISO(), other: [{ id: 'kcal', name: 'Kcal', value: 2100 }] }])
    expect(rows()).toHaveLength(5)
    expect(rows()[0].querySelector('.measure-day-v').textContent).toMatch(/Kcal\s*2.?100/)
    expect(rows()[1].querySelector('.measure-day-v').textContent).toContain('–')
    act(() => rows()[1].click())
    const yesterday = new Date(todayISO() + 'T12:00:00'); yesterday.setDate(yesterday.getDate() - 1)
    expect(measurementLogSheet).toHaveBeenCalledWith(isoOf(yesterday))
  })

  it('stays off Home without recent measurements', () => {
    mountWith([])
    expect(rows()).toHaveLength(0)
  })
})
