// ptv4's suggestions for the next session of a routine (Etap 4e), one line per exercise, shown
// while you train it. The sidecar writes them through the api (pin_tips), nothing reads them back:
//
//   S.extCoachNotes = { <routine id>: { at: <ms>, ex: { <exercise id>: 'text' } } }
//
// A top-level key rather than part of S.ext, so it syncs on its own stamp. A routine's entry
// stays in the state; it only stops showing once a workout of that routine started after `at`.

/** The suggestion for exercise `exId` in routine `rid`, or null when there is none or it is used up. */
export function coachTipFor(S, rid, exId) {
  if (rid == null || S?.active?.editingWorkoutId != null) return null
  const note = S?.extCoachNotes?.[rid]
  const text = typeof note?.ex?.[exId] === 'string' ? note.ex[exId].trim() : ''
  if (!text) return null
  const at = Number(note.at) || 0
  const trained = (S.workouts || []).some(w => (w.start || 0) >= at
    && (w.routineIds || (w.routineId ? [w.routineId] : [])).includes(rid))
  return trained ? null : text
}
