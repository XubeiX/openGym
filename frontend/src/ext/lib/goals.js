// e1RM goals (Etap 4d): S.ext.goals = [{ name, e1rm, deadline: 'YYYY-MM-DD' }], the only place they live.
// ptv4's sidecar reads them from the state file and answers with their status (set goals); openGym
// only lists, adds and removes them. `name` is the exercise as ptv4's sets name it, without the
// " (D3)" a lift trained on several days carries there: a goal is for the lift, all days together.

export const baseName = name => String(name || '').replace(/ \(D\d+\)$/, '')

// The lifts a goal can be set for: ptv4's active ones, most trained first, each once.
export const goalExercises = summary => [...new Set((summary || []).map(r => baseName(r.exercise)))]

export const goalsOf = ext => Array.isArray(ext?.goals) ? ext.goals : []

// ptv4's proposals for lifts that have no goal yet.
export const openProposals = (proposals, goals) => (proposals || []).filter(p => !goals.some(g => g.name === p.exercise))

// The goal to show on Home: not reached yet, soonest deadline first.
export const nearestGoal = rows => (rows || []).filter(r => r.status !== 'osiągnięty' && r.target_e1rm)
  .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || null

// One goal per lift: a new one for the same lift replaces it.
export const withGoal = (goals, goal) => [...goals.filter(g => g.name !== goal.name), goal]

// 'YYYY-MM-DD' `weeks` from today, local time.
export const inWeeks = (weeks, now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
