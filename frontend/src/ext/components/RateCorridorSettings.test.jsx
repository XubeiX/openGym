// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore, DEF } from '../../store/useStore.js'
import { extOf } from '../state.js'
import RateCorridorSettings from './RateCorridorSettings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container, root
const originalS = useStore.getState().S

function Screen() { return <RateCorridorSettings ext={extOf(useStore(s => s.S))} unit="kg" /> }
function show(ext) {
  useStore.setState({ S: { ...structuredClone(DEF), ext } })
  act(() => root.render(<Screen />))
}
const saved = () => useStore.getState().S.ext.rateCorridors
const field = label => container.querySelector(`input[aria-label="${label}"]`)
function type(label, value) {
  const el = field(label)
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const rowOf = title => [...container.querySelectorAll('.lrow')].find(r => r.querySelector('.lrow-t').textContent === title)
const unit = (title, name) => act(() => [...rowOf(title).querySelectorAll('button')].find(b => b.textContent === name).dispatchEvent(new MouseEvent('click', { bubbles: true })))

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

describe('Dodatki: rate corridors', () => {
  it('shows the defaults when nothing is saved', () => {
    show({})
    expect(field('Korytarz redukcji: Od').value).toBe('0.5')
    expect(field('Korytarz redukcji: Do').value).toBe('1')
    expect(field('Korytarz masy: Od').value).toBe('0.1')
    expect(field('Korytarz masy: Do').value).toBe('0.2')
    expect(saved()).toBeUndefined()
  })

  it('saves the whole corridor of a phase that has not started, leaving the other on its default', () => {
    show({ phases: [{ type: 'redukcja', start: '2026-10-01' }] })
    type('Korytarz masy: Do', '0,3')
    expect(saved()).toEqual({ masa: { by: 'w', lo: 0.1, hi: 0.3 } })
  })

  it('changes the unit of one corridor', () => {
    show({})
    unit('Korytarz redukcji', 'kg')
    expect(saved()).toEqual({ redukcja: { by: 'w', lo: 0.5, hi: 1 } })
    expect(rowOf('Korytarz redukcji').textContent).toContain('kg')
  })

  it('reads back what is saved', () => {
    show({ rateCorridors: { masa: { by: '%', lo: 0.25, hi: 0.5 } } })
    expect(field('Korytarz masy: Od').value).toBe('0.25')
    expect(field('Korytarz masy: Do').value).toBe('0.5')
  })
})
