// The order and visibility of the fork's Home cards and Statystyki+ sections, and of the tiles in
// them: S.ext.layout = { home: [{ id, on, tiles: { <id>: on } }], stats: [ … ] }, section order =
// array order. The registry below is the truth: a section or tile added in a later version shows
// up switched on at the end, one taken out of the registry drops out of what was saved.
export const REGISTRY = {
  home: [
    { id: 'checks', tiles: [] },
    { id: 'today', tiles: ['takeaway', 'readiness', 'mass', 'bb'] },
    { id: 'weight', tiles: [] },
    { id: 'recent', tiles: [] },
  ],
  stats: [
    { id: 'numbers', tiles: ['tdee', 'balAdapt', 'balWatch', 'protein', 'sleep', 'prs'] },
    { id: 'energy', tiles: ['tdeeCard', 'weight', 'protein'] },
    { id: 'recovery', tiles: ['readiness', 'hrv', 'rhr', 'bb', 'perf'] },
    { id: 'strength', tiles: ['lift', 'table'] },
    { id: 'volume', tiles: [] },
    { id: 'daily', tiles: ['sleep', 'steps', 'table'] },
  ],
}

// Before S.ext.layout existed, each Home card had its own switch (S.ext.homeChecks …).
const LEGACY = { checks: 'homeChecks', today: 'homeToday', weight: 'homeWeight', recent: 'homeRecent' }

export function layoutOf(ext, where) {
  const reg = REGISTRY[where]
  const saved = (ext?.layout?.[where] || []).filter(s => reg.some(r => r.id === s?.id))
  const ids = [...saved.map(s => s.id), ...reg.map(r => r.id).filter(id => !saved.some(s => s.id === id))]
  return ids.map(id => {
    const r = reg.find(x => x.id === id), s = saved.find(x => x.id === id)
    const on = s ? s.on !== false : ext?.[LEGACY[id]] !== false
    return { id, on, tiles: Object.fromEntries(r.tiles.map(t => [t, s?.tiles?.[t] !== false])) }
  })
}

// The layout after one change, ready to save as S.ext.layout[where].
export const withSection = (ext, where, id, patch) =>
  layoutOf(ext, where).map(s => s.id === id ? { ...s, ...patch, tiles: { ...s.tiles, ...(patch.tiles || {}) } } : s)

export const shown = (ext, where, id) => layoutOf(ext, where).find(s => s.id === id)
