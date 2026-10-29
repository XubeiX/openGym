// Fork settings live in S.ext: a top-level key of the state, so PUT/GET /api/data carries it and
// the phone and the laptop share it. Saved values are laid over the defaults, so a setting added
// later needs no migration.
import { useStore } from '../store/useStore.js'

export const EXT_DEFAULTS = {
  weightAvg: 0, // weight card: 0 = weigh-ins, 7 / 28 = MA7 / MA28 (lib/weight-ma.js)
}

export const extOf = S => ({ ...EXT_DEFAULTS, ...(S?.ext || {}) })

export const setExt = patch => useStore.getState().update(s => { s.ext = { ...(s.ext || {}), ...patch } })
