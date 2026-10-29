// Fork settings live in S.ext: a top-level key of the state, so PUT/GET /api/data carries it and
// the phone and the laptop share it. Saved values are laid over the defaults, so a setting added
// later needs no migration.
import { useStore } from '../store/useStore.js'

export const EXT_DEFAULTS = {
  weightAvg: 0, // weight card: 0 = weigh-ins, 7 / 28 = MA7 / MA28 (lib/weight-ma.js)
  homeWeight: true, // Home cards, switched in Settings → Dodatki
  homeRecent: true,
  homeChecks: true,
  // checks: { <id>: { on, days, after, everyDays } } and fields: { <role>: name } over lib/checks.js
  // CHECKS / FIELDS; snooze: the data-check card is hidden through this date
}

export const extOf = S => ({ ...EXT_DEFAULTS, ...(S?.ext || {}) })

export const setExt = patch => useStore.getState().update(s => { s.ext = { ...(s.ext || {}), ...patch } })

// One key inside S.ext.checks / S.ext.fields, the rest of it kept.
export const setExtIn = (key, id, patch) => useStore.getState().update(s => {
  const ext = s.ext || {}
  const cur = ext[key] || {}
  s.ext = { ...ext, [key]: { ...cur, [id]: typeof patch === 'object' && !Array.isArray(patch) ? { ...(cur[id] || {}), ...patch } : patch } }
})
