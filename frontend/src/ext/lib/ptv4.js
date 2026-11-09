// ptv4's datasets through openGym's api (GET /api/ext/ptv4, api/ext/routes.js). openGym computes
// none of these numbers: they come from ptv4's analyze.py, as the dashboard draws them.
//
// Stale-while-revalidate: the last answer per set is kept in localStorage and shown at once; a
// fresh one is fetched behind it and replaces it only when it differs. The sidecar keeps its own
// result warm, so the fetch itself is quick too.
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

const KEY = set => 'ext_ptv4_' + set
const saved = set => { try { return JSON.parse(localStorage.getItem(KEY(set))) } catch { return null } }
const stored = set => saved(set)?.data ?? null
// when the oldest of these sets was last answered (ms), or undefined
const storedAt = sets => { const t = sets.map(s => saved(s)?.at); return t.every(Boolean) ? Math.min(...t) : undefined }
const store = (set, data) => { try { localStorage.setItem(KEY(set), JSON.stringify({ at: Date.now(), data })) } catch { /* full or blocked: next open fetches */ } }

// One request per set at a time, and none again within 5 minutes unless `fresh`.
const TTL_MS = 5 * 60 * 1000
const inflight = new Map()
export function ptv4(set, fresh = false, persist = true) {
  const hit = inflight.get(set)
  if (hit && (!fresh || hit.pending) && Date.now() - hit.at < TTL_MS) return hit.p
  const entry = { at: Date.now(), pending: true }
  entry.p = api('/api/ext/ptv4?set=' + set)
    .then(data => { entry.pending = false; if (persist) store(set, data); return data })
    .catch(e => { inflight.delete(set); throw e })
  inflight.set(set, entry)
  return entry.p
}

// { data: { <set>: rows }, refreshing, at } from the stored answers at once (or { loading }), then
// { data, at } from the fresh ones; when the fetch fails with data shown, { data, failed, at }.
// `at`: the last good answer (ms), the oldest of the sets. { error } only when nothing is stored.
// `fresh`: ask the server even within 5 minutes; `persist: false`: nothing stored (the integration state, where an old answer would mislead).
// A failed fetch (not 401/403) is asked again once after 30 s and when the device goes online; no loop.
export function usePtv4(sets, { fresh = false, persist = true } = {}) {
  const key = sets.join(',')
  const initial = () => {
    const all = sets.map(s => persist ? stored(s) : null)
    return all.every(d => d != null) ? { data: Object.fromEntries(sets.map((s, i) => [s, all[i]])), refreshing: true, at: storedAt(sets) } : { loading: true }
  }
  const [st, setSt] = useState(initial)
  // bumped to fetch again: when shown (a PWA left open overnight comes back without remounting; ptv4() skips within 5 minutes) and by the retries below
  const [shown, setShown] = useState(0)
  // the 30 s retry already ran for this failure: the next one waits for visibility or online
  // (an online retry, often before the network works, keeps the 30 s one)
  const retried = useRef(false)
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') { retried.current = false; setShown(n => n + 1) } }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  useEffect(() => {
    let live = true, timer
    const again = () => setShown(n => n + 1)
    Promise.all(sets.map(s => ptv4(s, fresh, persist))).then(
      rows => {
        if (!live) return
        retried.current = false
        setSt(prev => {
          const data = Object.fromEntries(sets.map((s, i) => [s, rows[i]]))
          const at = (persist && storedAt(sets)) || Date.now()
          return { data: prev.data && JSON.stringify(prev.data) === JSON.stringify(data) ? prev.data : data, at }
        })
      },
      e => {
        // signed out or another profile: what is stored is someone else's, so it goes
        const auth = e?.status === 401 || e?.status === 403
        if (auth) sets.forEach(s => { try { localStorage.removeItem(KEY(s)) } catch { /* blocked */ } })
        if (!live) return
        setSt(prev => prev.data && !auth ? { data: prev.data, failed: true, at: prev.at } : { error: e?.message || String(e), status: e?.status })
        if (auth) return
        window.addEventListener('online', again)
        if (!retried.current) timer = setTimeout(() => { retried.current = true; again() }, 30000)
      })
    return () => { live = false; clearTimeout(timer); window.removeEventListener('online', again) }
  }, [key, shown]) // eslint-disable-line react-hooks/exhaustive-deps
  return st
}

// A date row → a chart point (ms).
export const at = iso => new Date(iso + 'T12:00:00').getTime()
// The rows of the last `days` days, by their `date` field.
export const since = (rows, date, days) => { const cut = Date.now() - days * 86400000; return rows.filter(r => at(r[date]) >= cut) }
