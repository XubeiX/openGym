// @vitest-environment happy-dom
// #19: Dodatki pick the drop that sets off the Sygnał NEAT.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindUI } from '../../components/ui.jsx'
import ExtSettings from './ExtSettings.jsx'
import { withSection } from '../layout.js'
import { L } from '../strings.js'

const mocks = vi.hoisted(() => ({ S: null, render: null, sheet: null }))
vi.mock('../../store/useStore.js', () => {
  const useStore = selector => selector({ S: mocks.S })
  useStore.getState = () => ({ update: fn => { fn(mocks.S); mocks.render() } })
  return { useStore }
})

bindUI({ getState: () => ({ openSheet: build => { mocks.sheet = build(() => {}) } }) })

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const roots = []
afterEach(() => { act(() => roots.splice(0).forEach(([root, host]) => { root.unmount(); host.remove() })) })
function mountIn(render) {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  roots.push([root, host])
  return { host, root, show: () => act(() => root.render(render())) }
}
function mount(ext = {}) {
  mocks.S = { unit: 'kg', workouts: [], routines: [], bodyweight: [], ext }
  const page = mountIn(() => <ExtSettings key={JSON.stringify(mocks.S.ext)} />)
  mocks.render = page.show
  page.show()
  return page.host
}
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const rowOf = host => [...host.querySelectorAll('.lrow')].find(r => r.querySelector('.lrow-t')?.textContent === L.neatDropPct)
function openSheet(host) {
  click(rowOf(host))
  const sheet = mountIn(() => mocks.sheet)
  sheet.show()
  return sheet.host
}

describe('Dodatki: the Sygnał NEAT threshold', () => {
  it('is 15% without an entry and offers 10 to 30%', () => {
    const host = mount()
    expect(rowOf(host).textContent).toContain('15%')
    const options = [...openSheet(host).querySelectorAll('.lrow-t')].map(o => o.textContent)
    expect(options).toEqual(['10%', '15%', '20%', '25%', '30%'])
  })

  it('saves the choice in S.ext', () => {
    const host = mount()
    click([...openSheet(host).querySelectorAll('.lrow')].find(o => o.textContent === '25%'))
    expect(mocks.S.ext.neatDropPct).toBe(25)
    expect(rowOf(host).textContent).toContain('25%')
  })

  it('stays with the Trend NEAT tile switched off', () => {
    const stats = withSection({}, 'stats', 'daily', { tiles: { steps: false } })
    expect(rowOf(mount({ layout: { stats } }))).toBeTruthy()
  })
})
