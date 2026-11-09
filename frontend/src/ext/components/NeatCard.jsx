import { useStore } from '../../store/useStore.js'
import { todayISO } from '../../lib/format.js'
import { Segmented } from '../../components/ui.jsx'
import { at, since } from '../lib/ptv4.js'
import { neatTrend } from '../lib/neat.js'
import { extOf, setExt } from '../state.js'
import { L, int } from '../strings.js'
import ExtChart from './ExtChart.jsx'
import { RANGES, useRange, RangeSwitch } from './ChartRange.jsx'

// Trend NEAT: daily steps as dots, one moving average (S.ext.neatAvg, MA7 or MA28) as the line. rows: ptv4's
// body set, whole, so the average at the start of the window counts the days before it. The window keeps
// the id of the steps chart this card replaced ('steps' in S.ext.chartRange).
export default function NeatCard({ rows }) {
  const { neatAvg: maDays, neatDropPct: threshold } = extOf(useStore(s => s.S))
  const range = useRange('steps')
  const { days, line, signal } = neatTrend({ rows, view: maDays, threshold, today: todayISO() })
  const points = (list, key) => since(list, 'd', RANGES[range]).map(p => ({ t: at(p.d), y: p[key] }))
  const key = 'ma' + maDays
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{L.neatTitle}</h2><span className="small muted">{L.byPtv4}</span></div>
    {signal && <div className="small" style={{ marginTop: 8, color: 'var(--red)', fontWeight: 600 }}>{L.neatSignal(signal)}</div>}
    <div style={{ marginTop: 10 }}>
      <Segmented className="seg-range" value={maDays} onChange={v => setExt({ neatAvg: v })}
        options={[{ value: 7, label: 'MA7' }, { value: 28, label: 'MA28' }]} />
      <RangeSwitch id="steps" value={range} />
      <ExtChart h={180} fmt={int} series={[
        { key: 'steps', name: L.series.steps, color: 'var(--ext-neutral)', kind: 'dots', points: points(days, 'steps') },
        { key, name: L.series[key], color: 'var(--ext-s1)', points: points(line, 'avg') },
      ]} />
    </div>
  </div>
}
