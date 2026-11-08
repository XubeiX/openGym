// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore, DEF } from '../../store/useStore.js'
import { extOf } from '../state.js'
import PhasesSettings from './PhasesSettings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container, root
const originalS = useStore.getState().S

// the settings screen hands the component S.ext on each change
function Screen() { return <PhasesSettings ext={extOf(useStore(s => s.S))} /> }
function show(phases) {
  useStore.setState({ S: { ...structuredClone(DEF), ext: { phases } } })
  act(() => root.render(<Screen />))
}
const saved = () => useStore.getState().S.ext.phases
const date = label => container.querySelector(`input[aria-label="${label}"]`)
function setDate(label, value) {
  const el = date(label)
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const button = name => [...container.querySelectorAll('button')].find(b => b.textContent === name || b.getAttribute('aria-label') === name)
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

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

describe('Dodatki: phases', () => {
  it('adds a running phase, saved without an end', () => {
    show([])
    expect(button('Dodaj fazę').disabled).toBe(true)
    setDate('Od', '2026-10-01')
    click(button('Dodaj fazę'))
    expect(saved()).toEqual([{ type: 'redukcja', start: '2026-10-01' }])
    expect(container.textContent).toContain('trwa')
  })

  it('adds the picked type with both dates', () => {
    show([])
    click(button('Masa'))
    setDate('Od', '2026-06-01')
    setDate('Do', '2026-06-30')
    click(button('Dodaj fazę'))
    expect(saved()).toEqual([{ type: 'masa', start: '2026-06-01', end: '2026-06-30' }])
  })

  it('will not save an end before the start, and says why', () => {
    show([])
    setDate('Od', '2026-06-10')
    setDate('Do', '2026-06-09')
    expect(button('Dodaj fazę').disabled).toBe(true)
    expect(container.textContent).toContain('Koniec nie może być wcześniej niż początek')
  })

  it('will not save a masa over a redukcja, and says why', () => {
    show([{ type: 'redukcja', start: '2026-10-01' }])
    click(button('Masa'))
    setDate('Od', '2026-10-20')
    expect(button('Dodaj fazę').disabled).toBe(true)
    expect(container.textContent).toContain('Masa i redukcja nie mogą się nakładać')
  })

  it('takes a deload inside a redukcja', () => {
    show([{ type: 'redukcja', start: '2026-10-01' }])
    click(button('Deload'))
    setDate('Od', '2026-10-20')
    setDate('Do', '2026-10-26')
    click(button('Dodaj fazę'))
    expect(saved()).toHaveLength(2)
  })

  it('corrects a phase in place, without it colliding with itself', () => {
    show([{ type: 'redukcja', start: '2026-10-01' }, { type: 'masa', start: '2026-06-01', end: '2026-06-30' }])
    click(button('Popraw: Redukcja'))
    setDate('Do', '2026-10-31')
    click(button('Zapisz'))
    expect(saved()).toEqual([{ type: 'masa', start: '2026-06-01', end: '2026-06-30' }, { type: 'redukcja', start: '2026-10-01', end: '2026-10-31' }])
    expect(button('Dodaj fazę')).toBeTruthy()
  })

  it('removes a phase', () => {
    show([{ type: 'redukcja', start: '2026-10-01' }, { type: 'masa', start: '2026-06-01', end: '2026-06-30' }])
    click(button('Usuń: Masa'))
    expect(saved()).toEqual([{ type: 'redukcja', start: '2026-10-01' }])
  })
})
