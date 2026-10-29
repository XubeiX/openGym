// The data-check card (Etap 1): what is missing in openGym's own state right now. Only the
// presence of entries is checked; the one rule borrowed from ptv4 is the incomplete Fitatu log
// (analyze.py macro_complete: 4·protein + 4·carbs + 9·fat below 70% of the kcal eaten).
import { isoOf } from '../../lib/format.js'

// The custom measurement each role reads, by name: ptv4-skill/data/opengym.json by default,
// another field from S.customMeasurements when picked in Settings (S.ext.fields), shared by all checks.
export const FIELDS = {
  eat: 'Kcal zjedzone', protein: 'Białko (g)', fat: 'Tłuszcz (g)', carbs: 'Węglowodany (g)',
  sleep: 'Sen (h)', steps: 'Kroki', burn: 'Kcal spalone',
}
export const CHECKS = {
  weigh: { on: true, days: [0, 1, 2, 3, 4, 5, 6], after: 6 },
  food: { on: true },
  fitatu: { on: true },
  sleep: { on: true, after: 10 },
  burn: { on: false },
  waist: { on: false, everyDays: 7, days: [1] }, // everyDays > 0: every N days, else on the listed weekdays
}

// Saved settings over the defaults, one check at a time, so a check added later needs no migration.
export const checksOf = ext => Object.fromEntries(Object.entries(CHECKS).map(([id, def]) => [id, { ...def, ...(ext?.checks?.[id] || {}) }]))
export const fieldsOf = ext => ({ ...FIELDS, ...(ext?.fields || {}) })

const shift = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

// The value of a custom measurement, by its name, on day `d` (null when not logged).
function valueOf(S, name, d) {
  const id = (S.customMeasurements || []).find(c => c.name === name)?.id
  const entry = (S.measurements || []).find(m => m.d === d)
  const v = id && entry ? (entry.other || []).find(o => o.id === id)?.value : null
  return v == null || v === '' || !Number.isFinite(+v) ? null : +v
}
const known = (S, names) => names.filter(n => (S.customMeasurements || []).some(c => c.name === n))

/**
 * [{ id, label, detail?, day, action }] for what is missing at `now`; [] while snoozed.
 * action: 'weigh' (the weigh-in sheet), 'log' (the check-in of `day`), 'info' (a message only).
 * garminDown: the integration state already warns that the watch's data stopped, so sleep is not asked twice.
 */
export function missingChecks(S, now, ext, { garminDown = false } = {}) {
  const today = isoOf(now), yesterday = shift(today, -1)
  if (ext?.snooze && ext.snooze >= today) return []
  const c = checksOf(ext), f = fieldsOf(ext), out = []
  const hour = now.getHours(), weekday = now.getDay()

  if (c.weigh.on && c.weigh.days.includes(weekday) && hour >= c.weigh.after && !(S.bodyweight || []).some(b => b.d === today))
    out.push({ id: 'weigh', day: today, action: 'weigh' })

  if (c.food.on) {
    const gaps = known(S, [f.eat, f.protein, f.fat, f.carbs]).filter(n => valueOf(S, n, yesterday) == null)
    if (gaps.length) out.push({ id: 'food', day: yesterday, action: 'log', detail: gaps.join(', ') })
  }

  if (c.fitatu.on) {
    const [eat, p, fat, cb] = [f.eat, f.protein, f.fat, f.carbs].map(n => valueOf(S, n, yesterday))
    const macroKcal = 4 * p + 4 * cb + 9 * fat
    if (eat > 0 && p != null && fat != null && cb != null && macroKcal < 0.7 * eat)
      out.push({ id: 'fitatu', day: yesterday, action: 'log', detail: `${Math.round(macroKcal / eat * 100)}%` })
  }

  if (c.sleep.on && !garminDown && hour >= c.sleep.after && known(S, [f.sleep]).some(n => valueOf(S, n, today) == null))
    out.push({ id: 'sleep', day: today, action: 'info' })

  if (c.burn.on) {
    const gaps = known(S, [f.steps, f.burn]).filter(n => valueOf(S, n, yesterday) == null)
    if (gaps.length) out.push({ id: 'burn', day: yesterday, action: 'info', detail: gaps.join(', ') })
  }

  if (c.waist.on) {
    const logged = d => (S.measurements || []).some(m => m.d === d && Number(m.waist) > 0)
    const due = c.waist.everyDays > 0
      ? !Array.from({ length: c.waist.everyDays }, (_, i) => shift(today, -i)).some(logged)
      : c.waist.days.includes(weekday) && !logged(today)
    if (due) out.push({ id: 'waist', day: today, action: 'log' })
  }
  return out
}
