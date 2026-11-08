// Training phases: S.ext.phases = [{ type: 'masa' | 'redukcja' | 'deload', start: 'YYYY-MM-DD', end?: 'YYYY-MM-DD' }].
// No `end` = still running. ptv4's sidecar reads them from the state file for the strength guard.

import { inWeeks } from './goals.js'

export const phasesOf = ext => Array.isArray(ext?.phases) ? ext.phases : []

const OPEN = '9999-12-31'

// Why this phase cannot be saved next to `others` ('noStart' | 'endBeforeStart' | 'overlap'), or null.
export function phaseError(phase, others) {
  if (!phase.start) return 'noStart'
  if (phase.end && phase.end < phase.start) return 'endBeforeStart'
  if (phase.type === 'deload') return null
  const end = phase.end || OPEN
  return others.some(o => o.type !== 'deload' && o.start <= end && phase.start <= (o.end || OPEN)) ? 'overlap' : null
}

// The phase of a day ('YYYY-MM-DD') or null; a deload wins over what is around it, no `end` = through today.
export function phaseOn(phases, day, today = inWeeks(0)) {
  const on = phases.filter(p => p.start <= day && day <= (p.end || today))
  return (on.find(p => p.type === 'deload') || on[0])?.type ?? null
}

// A chart window (ms, first and last point) as runs of days of one phase: [{ type, start, end }].
export function phaseRuns(phases, t0, t1, today = inWeeks(0)) {
  const runs = [], d = new Date(t0)
  let prev = null
  for (let i = 0, n = Math.round((t1 - t0) / 86400000); i <= n; i++, d.setDate(d.getDate() + 1)) {
    const day = inWeeks(0, d), type = phaseOn(phases, day, today)
    if (type && type === prev) runs.at(-1).end = day
    else if (type) runs.push({ type, start: day, end: day })
    prev = type
  }
  return runs
}
