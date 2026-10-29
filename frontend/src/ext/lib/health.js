// Integration state (Etap 2b): Garmin, Fitatu and the backups as ptv4's sidecar judges them
// (GET /api/ext/ptv4?set=health). openGym only shows it. Not kept in localStorage: an old answer
// would show a problem that is already gone.
import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const TTL_MS = 5 * 60 * 1000
const FAIL_KEY = 'ext_health_fail'
const getFails = () => { try { return +localStorage.getItem(FAIL_KEY) || 0 } catch { return 0 } }
const setFails = n => { try { localStorage.setItem(FAIL_KEY, String(n)) } catch { /* blocked */ } }

let entry = null
function load() {
  if (entry && Date.now() - entry.at < TTL_MS) return entry.p
  const e = { at: Date.now() }
  e.p = api('/api/ext/ptv4?set=health').then(
    items => { setFails(0); return items },
    err => {
      // the sidecar refused or did not answer (the api's 503); a phone with no network is not a problem here
      if (err?.status === 503 && navigator.onLine !== false) setFails(getFails() + 1)
      e.at = Date.now() - TTL_MS + 60 * 1000 // after a failure, try again in a minute rather than five
      throw err
    })
  entry = e
  return e.p
}

/** { items: [{ id, label, ok, since, message, help }] | null, down: the sidecar failed twice in a row }.
 *  Not the owner, signed out or offline: items null, down false — nothing to warn about. */
export function useHealth() {
  const [st, setSt] = useState({ items: null, down: getFails() >= 2 })
  useEffect(() => {
    let live = true
    load().then(items => live && setSt({ items, down: false }), () => live && setSt({ items: null, down: getFails() >= 2 }))
    return () => { live = false }
  }, [])
  return st
}

// The rows to warn about: the failing items, or one row for an unreachable sidecar.
export const problems = ({ items, down }) => down ? [{ id: 'sidecar', down: true }] : (items || []).filter(i => i.ok === false)
export const garminDown = ({ items }) => (items || []).some(i => i.id === 'garmin_data' && i.ok === false)
