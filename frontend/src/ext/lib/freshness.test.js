import { describe, expect, it } from 'vitest'
import { freshnessLine } from './freshness.js'

const now = new Date(2026, 10, 6, 9, 30).getTime()
const data = { kpi: [{}] }

describe('freshnessLine', () => {
  it('says nothing when the last request worked', () => {
    expect(freshnessLine({ data, at: now }, now)).toBe(null)
  })

  it('says it is checking while a request is in flight', () => {
    expect(freshnessLine({ data, refreshing: true, at: now - 3600e3 }, now)).toBe('Pokazuję ostatnie dane, sprawdzam nowsze…')
  })

  it('gives only the hour when the failed data is from today', () => {
    expect(freshnessLine({ data, failed: true, at: new Date(2026, 10, 6, 7, 2).getTime() }, now)).toBe('Nie udało się odświeżyć · dane z 7:02')
  })

  it('gives day and hour when the failed data is from another day', () => {
    expect(freshnessLine({ data, failed: true, at: new Date(2026, 10, 5, 22, 10).getTime() }, now)).toBe('Nie udało się odświeżyć · dane z 5.11, 22:10')
    expect(freshnessLine({ data, failed: true, at: new Date(2026, 2, 5, 8, 5).getTime() }, now)).toBe('Nie udało się odświeżyć · dane z 5.03, 8:05')
  })

  it('says nothing without data or without a timestamp', () => {
    expect(freshnessLine({ loading: true }, now)).toBe(null)
    expect(freshnessLine({ error: 'x' }, now)).toBe(null)
    expect(freshnessLine({ data, failed: true }, now)).toBe(null)
    expect(freshnessLine({ data, refreshing: true }, now)).toBe(null)
  })
})
