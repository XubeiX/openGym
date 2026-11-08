// Strength guard settings: S.ext.strengthGuard = { lifts: string[], threshold: number } (names without the " (D3)"
// of a lift on several days, threshold in %). ptv4's sidecar reads them from the state file (opengym.state_guard).
// No `lifts` = the default set, [] = nothing guarded.

import { L } from '../strings.js'
import { goalExercises } from './goals.js'

// The same names as opengym.GUARD_LIFTS in ptv4.
export const GUARD_LIFTS = ['Podciąganie Nachwytem Z Obciążeniem', 'Wyciskanie Sztangi Na Ławce Płaskiej', 'Wyciskanie Żołnierskie Sztangi Stojąc', 'Przysiad Hack Na Maszynie', 'Martwy Ciąg Rumuński Ze Sztangą']

export const guardLifts = ext => Array.isArray(ext?.strengthGuard?.lifts) ? ext.strengthGuard.lifts : GUARD_LIFTS

// The lifts to pick from: ptv4's active ones, then what is picked but no longer active, so it can still be unpicked.
export const guardOptions = (summary, lifts) => [...new Set([...goalExercises(summary), ...lifts])]

export const flipLift = (lifts, name) => lifts.includes(name) ? lifts.filter(n => n !== name) : [...lifts, name]

// A cleared field (null) drops the key, which means the default.
export const withThreshold = ({ threshold: _old, ...guard } = {}, threshold) => threshold == null ? guard : { ...guard, threshold }

// The strength guard's line on Home's "Dziś": the most serious of ptv4's strength_guard rows and how many others there are.
export function guardLine(rows) {
  if (!rows?.length) return null
  const worst = rows.reduce((a, b) => b.change_pct < a.change_pct ? b : a)
  return L.guardDrop(worst) + (rows.length > 1 ? L.guardOthers(rows.length - 1) : '')
}
