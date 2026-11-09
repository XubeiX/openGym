// Tempo masy (GLOSSARY.md in ptv4) as the weight card's view counts it. weightRate's result shape
// throughout, so upstream's rateStatus reads every view the same.

import { weightRate, rateStatus } from '../../lib/bodyweight.js'
import { isoOf } from '../../lib/format.js'
import { dayNo, weightMA } from './weight-ma.js'

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

// view: 0 weigh-ins, 7 / 28 that average. goal: rateStatus's corridor, or nothing.
// { rate: { enough, perWeek?, pct? }, status: 'in' | 'slow' | 'fast' | 'off' | null }
export function massRate({ bodyweight, view, goal, now = Date.now() }) {
  const rate = viewRate(bodyweight, view, now)
  return { rate, status: rateStatus(rate, goal) }
}
