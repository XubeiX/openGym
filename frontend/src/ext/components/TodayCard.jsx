import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { Button } from '../../components/ui.jsx'
import { usePtv4 } from '../lib/ptv4.js'
import { L } from '../strings.js'
import { nearestGoal } from '../lib/goals.js'
import { freshnessLine } from '../lib/freshness.js'
import { guardLine } from '../lib/guard.js'
import { massRate } from '../lib/mass-rate.js'
import { extOf } from '../state.js'

// Home's "Dziś": ptv4's takeaway, today's Training Readiness, the 28-day mass rate, Body Battery and the nearest goal, plus the way
// into Statystyki+. All from the sidecar; offline, signed out or no ptv4 → the card is not there.
export default function TodayCard({ tiles = {} }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const st = usePtv4(['kpi', 'garmin_kpi', 'goals', 'strength_guard'])
  const k = st.data?.kpi?.[0]
  if (!k) return null
  const g = st.data.garmin_kpi?.[0]
  const goal = nearestGoal(st.data.goals)
  const freshness = freshnessLine(st)
  const guard = tiles.guard !== false && guardLine(st.data.strength_guard)
  const signal = tiles.rateSignal !== false && massRate({ bodyweight: S.bodyweight, ext: extOf(S) }).signal
  return <div className="card">
    <div className="row between" style={{ marginBottom: 6 }}>
      <h2 style={{ margin: 0 }}>{L.today}</h2>
      <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={() => nav('/ptv4')}>{L.homeTile}</Button>
    </div>
    {freshness && <div className="small muted" style={{ marginBottom: 6 }}>{freshness}</div>}
    {tiles.takeaway !== false && <div className="small" style={{ marginBottom: 10 }}>{k.takeaway}</div>}
    {guard && <div className="small" style={{ marginBottom: 10, color: 'var(--red)', fontWeight: 600 }}>{guard}</div>}
    {signal && <div className="small" style={{ marginBottom: 10, color: 'var(--red)', fontWeight: 600 }}>{L.rateSignal[signal]}</div>}
    <div className="tiles" style={{ marginBottom: 0 }}>
      {tiles.readiness !== false && <div className="tile" style={{ background: 'var(--surface-2)' }}>
        <div className="l">{L.readiness}</div>
        <div className="v" style={{ fontSize: 22 }}>{g?.ready_txt ?? '–'}</div>
        <div className="small muted">{g?.ready_sub ?? L.noData}</div>
      </div>}
      {tiles.mass !== false && <div className="tile" style={{ background: 'var(--surface-2)' }}>
        <div className="l">{L.massRate}</div>
        <div className="v" style={{ fontSize: 22 }}>{k.pct_wk_txt}</div>
        <div className="small muted">{L.massRateSub}</div>
      </div>}
      {tiles.bb !== false && <div className="tile" style={{ background: 'var(--surface-2)' }}>
        <div className="l">{L.bodyBattery}</div>
        <div className="v" style={{ fontSize: 22 }}>{g?.bb_txt ?? '–'}</div>
        <div className="small muted">{g?.bb_sub ?? L.noData}</div>
      </div>}
      {tiles.goal !== false && goal && <div className="tile" style={{ background: 'var(--surface-2)' }}>
        <div className="l">{L.nearestGoal}</div>
        <div className="v" style={{ fontSize: 22 }}>{L.goalStatus[goal.status] || goal.status}</div>
        <div className="small muted">{goal.exercise}: {goal.goal}</div>
      </div>}
    </div>
    <div className="small muted" style={{ marginTop: 8 }}>{L.byPtv4}</div>
  </div>
}
