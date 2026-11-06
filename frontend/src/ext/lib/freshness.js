// The grey line under a ptv4 card's title: how fresh the shown data is. `st` is usePtv4()'s state.
import { L } from '../strings.js'

const pad = n => String(n).padStart(2, '0')
const hm = d => `${d.getHours()}:${pad(d.getMinutes())}`

export function freshnessLine(st, now = Date.now()) {
  if (!st.data || !st.at) return null
  if (st.refreshing) return L.refreshing
  if (!st.failed) return null
  const d = new Date(st.at)
  return L.refreshFailed(new Date(now).toDateString() === d.toDateString() ? hm(d) : `${d.getDate()}.${pad(d.getMonth() + 1)}, ${hm(d)}`)
}
