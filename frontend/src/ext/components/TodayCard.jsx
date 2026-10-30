import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui.jsx'
import { usePtv4 } from '../lib/ptv4.js'
import { L } from '../strings.js'

// Home's "Dziś": ptv4's takeaway, today's Training Readiness, the 28-day mass rate and Body Battery, plus the way
// into Statystyki+. All from the sidecar; offline, signed out or no ptv4 → the card is not there.
export default function TodayCard({ tiles = {} }) {
  const nav = useNavigate()
  const st = usePtv4(['kpi', 'garmin_kpi'])
  const k = st.data?.kpi?.[0]
  if (!k) return null
  const g = st.data.garmin_kpi?.[0]
  return <div className="card">
    <div className="row between" style={{ marginBottom: 6 }}>
      <h2 style={{ margin: 0 }}>{L.today}</h2>
      <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={() => nav('/ptv4')}>{L.homeTile}</Button>
    </div>
    {tiles.takeaway !== false && <div className="small" style={{ marginBottom: 10 }}>{k.takeaway}</div>}
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
    </div>
    <div className="small muted" style={{ marginTop: 8 }}>{L.byPtv4}</div>
  </div>
}
