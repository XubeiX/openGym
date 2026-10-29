// ptv4's datasets through openGym's api (GET /api/ext/ptv4, api/ext/routes.js). openGym computes
// none of these numbers: they come from ptv4's analyze.py, as the dashboard draws them.
//
// Stale-while-revalidate: the last answer per set is kept in localStorage and shown at once; a
// fresh one is fetched behind it and replaces it only when it differs. The sidecar keeps its own
// result warm, so the fetch itself is quick too.
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const KEY = set => 'ext_ptv4_' + set
const stored = set => { try { return JSON.parse(localStorage.getItem(KEY(set)))?.data ?? null } catch { return null } }
const store = (set, data) => { try { localStorage.setItem(KEY(set), JSON.stringify({ at: Date.now(), data })) } catch { /* full or blocked: next open fetches */ } }

// One request per set at a time, and none again within 5 minutes unless `fresh`.
const TTL_MS = 5 * 60 * 1000
const inflight = new Map()
export function ptv4(set, fresh = false) {
  const hit = inflight.get(set)
  if (hit && (!fresh || hit.pending) && Date.now() - hit.at < TTL_MS) return hit.p
  const entry = { at: Date.now(), pending: true }
  entry.p = api('/api/ext/ptv4?set=' + set)
    .then(data => { entry.pending = false; store(set, data); return data })
    .catch(e => { inflight.delete(set); throw e })
  inflight.set(set, entry)
  return entry.p
}

// { data: { <set>: rows } } from the stored answers at once (or { loading }), then the fresh ones;
// { error } only when there is nothing stored to show. `fresh`: ask the server even within 5 minutes.
export function usePtv4(sets, { fresh = false } = {}) {
  const key = sets.join(',')
  const initial = () => {
    const all = sets.map(stored)
    return all.every(d => d != null) ? { data: Object.fromEntries(sets.map((s, i) => [s, all[i]])), stale: true } : { loading: true }
  }
  const [st, setSt] = useState(initial)
  useEffect(() => {
    let live = true
    Promise.all(sets.map(s => ptv4(s, fresh))).then(
      rows => live && setSt(prev => {
        const data = Object.fromEntries(sets.map((s, i) => [s, rows[i]]))
        return prev.data && JSON.stringify(prev.data) === JSON.stringify(data) ? { data: prev.data } : { data }
      }),
      e => {
        // signed out or another profile: what is stored is someone else's, so it goes
        if (e?.status === 401 || e?.status === 403) sets.forEach(s => { try { localStorage.removeItem(KEY(s)) } catch { /* blocked */ } })
        if (live) setSt(prev => prev.data && e?.status !== 401 && e?.status !== 403 ? { ...prev, stale: true } : { error: e?.message || String(e) })
      })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return st
}

// A date row → a chart point (ms).
export const at = iso => new Date(iso + 'T12:00:00').getTime()
