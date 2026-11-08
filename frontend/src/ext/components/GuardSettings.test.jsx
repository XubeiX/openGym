// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore, DEF } from '../../store/useStore.js'
import { extOf } from '../state.js'
import GuardSettings from './GuardSettings.jsx'

const mocks = vi.hoisted(() => ({ summary: [] }))
vi.mock('../lib/ptv4.js', () => ({ usePtv4: () => ({ data: { lift_summary: mocks.summary } }) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container, root
const originalS = useStore.getState().S
const HACK = 'Przysiad Hack Na Maszynie', RDL = 'Martwy Ciąg Rumuński Ze Sztangą'

function Screen() { return <GuardSettings ext={extOf(useStore(s => s.S))} /> }
function show(ext, summary = [{ exercise: `${HACK} (D3)` }, { exercise: 'Wiosłowanie' }, { exercise: `${HACK} (D5)` }]) {
  mocks.summary = summary
  useStore.setState({ S: { ...structuredClone(DEF), ext } })
  act(() => root.render(<Screen />))
}
const saved = () => useStore.getState().S.ext.strengthGuard
const chips = () => [...container.querySelectorAll('button[aria-pressed]')]
const chip = name => chips().find(b => b.textContent === name)
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const field = () => container.querySelector('input[aria-label="Próg spadku"]')
function type(value) {
  const el = field()
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  useStore.setState({ S: originalS })
})

describe('Dodatki: strength guard', () => {
  it('lists active lifts once without the plan day, with the default set picked', () => {
    show({})
    expect(chip(HACK).getAttribute('aria-pressed')).toBe('true')
    expect(chip('Wiosłowanie').getAttribute('aria-pressed')).toBe('false')
    expect(chips().filter(b => b.textContent.startsWith('Przysiad Hack'))).toHaveLength(1)
    expect(chips().filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(5)
  })

  it('unpicking a default lift saves the rest of the set', () => {
    show({})
    click(chip(HACK))
    expect(saved().lifts).toHaveLength(4)
    expect(saved().lifts).not.toContain(HACK)
    expect(saved().lifts).toContain(RDL)
    expect(chip(HACK).getAttribute('aria-pressed')).toBe('false')
  })

  it('adds an active lift to a saved list', () => {
    show({ strengthGuard: { lifts: [HACK], threshold: 7 } })
    click(chip('Wiosłowanie'))
    expect(saved()).toEqual({ lifts: [HACK, 'Wiosłowanie'], threshold: 7 })
  })

  it('shows 5% as the default and saves a typed threshold without pinning the default list', () => {
    show({})
    expect(field().value).toBe('')
    expect(field().placeholder).toBe('5')
    type('7,5')
    expect(saved()).toEqual({ threshold: 7.5 })
  })

  it('goes back to the default when the threshold is cleared', () => {
    show({ strengthGuard: { lifts: [HACK], threshold: 7 } })
    expect(field().value).toBe('7')
    type('')
    expect(saved()).toEqual({ lifts: [HACK] })
    expect(field().value).toBe('')
  })
})
