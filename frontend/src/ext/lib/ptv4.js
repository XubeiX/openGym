// ptv4's datasets through openGym's api (GET /api/ext/ptv4, api/ext/routes.js). openGym computes
// none of these numbers: they come from ptv4's analyze.py, as the dashboard draws them.
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

// One request per set for 5 minutes (Home re-renders often); Statystyki+ calls clearPtv4() on open.
const TTL_MS = 5 * 60 * 1000
const cache = new Map()
export const clearPtv4 = () => cache.clear()
export function ptv4(set) {
  const hit = cache.get(set)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.p
  const p = api('/api/ext/ptv4?set=' + set).catch(e => { cache.delete(set); throw e })
  cache.set(set, { p, at: Date.now() })
  return p
}

// { loading } → { data: { <set>: rows } } or { error }.
export function usePtv4(sets) {
  const key = sets.join(',')
  const [st, setSt] = useState({ loading: true })
  useEffect(() => {
    let live = true
    setSt({ loading: true })
    Promise.all(sets.map(ptv4)).then(
      rows => live && setSt({ data: Object.fromEntries(sets.map((s, i) => [s, rows[i]])) }),
      e => live && setSt({ error: e?.message || String(e) }))
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return st
}

// A date row → a chart point (LineChart takes ms).
export const at = iso => new Date(iso + 'T12:00:00').getTime()
