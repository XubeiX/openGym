import { useStore } from '../../store/useStore.js'
import { Segmented } from '../../components/ui.jsx'
import { at } from '../lib/ptv4.js'
import { extOf, setExtIn } from '../state.js'

// A chart's time window; a year at most, older is history.
export const RANGES = { '1M': 31, '3M': 92, '1Y': 365 }
export const since = (rows, date, days) => { const cut = Date.now() - days * 86400000; return rows.filter(r => at(r[date]) >= cut) }

// A chart's own 1M / 3M / 1Y switch, as on openGym's body-weight card; saved per chart in
// S.ext.chartRange (3M by default). Liczby keep ptv4's own windows.
export function useRange(id) {
  const r = extOf(useStore(s => s.S)).chartRange?.[id]
  return RANGES[r] ? r : '3M'
}
export const RangeSwitch = ({ id, value }) => <Segmented className="seg-range" value={value} onChange={v => setExtIn('chartRange', id, v)}
  options={Object.keys(RANGES).map(v => ({ value: v, label: v }))} />
