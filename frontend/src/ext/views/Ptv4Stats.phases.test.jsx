// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore, DEF } from '../../store/useStore.js'
import { setExt } from '../state.js'
import Ptv4Stats from './Ptv4Stats.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Daily weigh-ins from 10 Oct to 7 Nov 2026, so the chart's window starts inside the deload below.
const body = Array.from({ length: 29 }, (_, i) => {
  const d = new Date(2026, 9, 10 + i, 12)
  return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, weight: 80, ma7: 80, ma28: 80 }
})
vi.mock('../../lib/api.js', async importOriginal => ({
  ...await importOriginal(),
  api: async url => url.endsWith('set=body') ? body : [],
}))

const phases = [
  { type: 'masa', start: '2025-01-01', end: '2025-03-01' },
  { type: 'redukcja', start: '2026-10-01' },
  { type: 'deload', start: '2026-10-08', end: '2026-10-14' },
]

let container, root
const originalS = useStore.getState().S

async function renderStats(ext) {
  useStore.setState({ S: { ...structuredClone(DEF), ext } })
  await act(async () => root.render(<MemoryRouter><Ptv4Stats /></MemoryRouter>))
  await act(async () => { await Promise.resolve() })
}
const weightCard = () => [...container.querySelectorAll('.card')].find(c => c.textContent.includes('Waga z MA7'))
const bands = () => [...weightCard().querySelectorAll('[data-phase]')].map(b => b.getAttribute('data-phase'))
const legend = () => weightCard().querySelector('.ext-legend').textContent

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 8, 12))
  localStorage.clear()
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  useStore.setState({ S: originalS })
})

describe('Statystyki+ phase bands', () => {
  it('draws the phases of the window, a deload over the redukcja around it', async () => {
    await renderStats({ phases })
    expect(bands()).toEqual(['deload', 'redukcja'])
  })

  it('names in the legend only the phases in the window', async () => {
    await renderStats({ phases })
    expect(legend()).toContain('deload')
    expect(legend()).toContain('redukcja')
    expect(legend()).not.toContain('masa')
  })

  it('names the phase of the hovered day in the tooltip', async () => {
    await renderStats({ phases })
    act(() => weightCard().querySelector('svg').dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 0 })))
    expect(weightCard().querySelector('.ext-tip').textContent).toContain('Faza: deload')
  })

  it('shows a change made in Dodatki at once', async () => {
    await renderStats({ phases })
    act(() => setExt({ phases: [{ type: 'masa', start: '2026-10-20' }] }))
    expect(bands()).toEqual(['masa'])
    expect(legend()).toContain('masa')
  })

  it('stays as it was without phases', async () => {
    await renderStats({})
    expect(bands()).toEqual([])
    expect(legend()).not.toMatch(/masa|redukcja|deload/)
    act(() => weightCard().querySelector('svg').dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 0 })))
    expect(weightCard().querySelector('.ext-tip').textContent).not.toContain('Faza')
  })
})
