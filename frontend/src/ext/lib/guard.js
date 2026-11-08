// The strength guard's line on Home's "Dziś": the most serious of ptv4's strength_guard rows and how many others there are.
import { L } from '../strings.js'

export function guardLine(rows) {
  if (!rows?.length) return null
  const worst = rows.reduce((a, b) => b.change_pct < a.change_pct ? b : a)
  return L.guardDrop(worst) + (rows.length > 1 ? L.guardOthers(rows.length - 1) : '')
}
