// Tempo masy (GLOSSARY.md in ptv4) as the weight card's view counts it. weightRate's result shape
// throughout, so upstream's rateStatus reads every view the same.

import { weightRate, rateStatus } from '../../lib/bodyweight.js'
import { isoOf } from '../../lib/format.js'
import { dayNo, weightMA } from './weight-ma.js'
import { phaseOn, phasesOf } from './phases.js'

// Korytarz tempa of each phase with a direction. S.ext.rateCorridors = { redukcja?, masa? }, each a whole
// { by: '%' | 'w', lo, hi }: unsigned bounds per week, 'w' = the profile's unit as in S.rateGoal.
// No entry = these defaults. ptv4 reads the same shape.
export const DEFAULT_CORRIDORS = { redukcja: { by: '%', lo: 0.5, hi: 1 }, masa: { by: 'w', lo: 0.1, hi: 0.2 } }
const PHASE_DIR = { redukcja: 'lose', masa: 'gain' }

export const corridorOf = (ext, type) => ext?.rateCorridors?.[type] || DEFAULT_CORRIDORS[type]

// S.ext.rateStallPct, in % of body weight over 14 days. No entry = this. ptv4 can read the same key.
export const DEFAULT_STALL_PCT = 0.2

// How much older than asked a point of the average may be.
const SLACK_DAYS = 3

// An average's value now minus its value `days` ago, and the value now; null without such points.
function maChange(bodyweight, key, days, today) {
  const pts = weightMA(bodyweight).filter(r => r[key] != null && r.d <= today)
  const last = pts.at(-1)
  if (!last || dayNo(today) - dayNo(last.d) > SLACK_DAYS) return null
  const ageOf = r => dayNo(last.d) - dayNo(r.d)
  const base = pts.findLast(r => ageOf(r) >= days)
  if (!base || ageOf(base) > days + SLACK_DAYS) return null
  return { change: last[key] - base[key], value: last[key] }
}

function viewRate(bodyweight, view, now) {
  if (!view) return weightRate(bodyweight, { now })
  const c = maChange(bodyweight, 'ma' + view, 7, isoOf(new Date(now)))
  return c ? { enough: true, perWeek: c.change, pct: c.change / c.value * 100 } : { enough: false }
}

// rateStatus's corridor for the phase running on a day; null in a deload and outside redukcja and masa.
function phaseGoal(ext, day) {
  const type = phaseOn(phasesOf(ext), day, day)
  return PHASE_DIR[type] ? { ...corridorOf(ext, type), dir: PHASE_DIR[type] } : null
}

// Sygnał tempa: always MA7 over 14 days, whatever view the card is on. Null without a corridor phase or the data.
function rateSignal(bodyweight, ext, day) {
  const goal = phaseGoal(ext, day)
  const c = goal && maChange(bodyweight, 'ma7', 14, day)
  if (!c) return null
  const perWeek = c.change / 2, pct = perWeek / c.value * 100
  if (rateStatus({ enough: true, perWeek, pct }, goal) === 'fast') return goal.dir === 'lose' ? 'cutFast' : 'bulkFast'
  // Two decimals, as rateStatus reads the corridor.
  const fell = Math.round(-pct * 200) / 100
  return goal.dir === 'lose' && fell < (ext?.rateStallPct ?? DEFAULT_STALL_PCT) ? 'stall' : null
}

// view: 0 weigh-ins, 7 / 28 that average. ext: S.ext, for its phases, corridors and stall threshold.
// { rate: { enough, perWeek?, pct? }, status: 'in' | 'slow' | 'fast' | null, signal: 'stall' | 'cutFast' | 'bulkFast' | null }
export function massRate({ bodyweight, view, ext, now = Date.now() }) {
  const rate = viewRate(bodyweight, view, now), day = isoOf(new Date(now))
  return { rate, status: rateStatus(rate, phaseGoal(ext, day)), signal: rateSignal(bodyweight, ext, day) }
}
