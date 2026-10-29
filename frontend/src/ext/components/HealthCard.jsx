import { useUI } from '../../store/useUI.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import Icon from '../../components/Icon.jsx'
import { useHealth, problems } from '../lib/health.js'
import { L } from '../strings.js'

const explain = p => useUI.getState().toast(p.down ? L.sidecarDownMsg : p.message + (p.help ? ` ${L.readme}: „${p.help}”.` : ''), { ms: 9000 })

// Top of Home, red, only while an integration is broken: Garmin, Fitatu, the backups, or the sidecar itself.
export default function HealthCard() {
  const rows = problems(useHealth())
  if (!rows.length) return null
  return <div className="card ext-health">
    <div className="row" style={{ gap: 8, marginBottom: 4 }}>
      <Icon name="info" style={{ color: 'var(--red)' }} />
      <h2 style={{ margin: 0 }}>{L.healthTitle}</h2>
    </div>
    {rows.map(p => <div className="measure-day tappable" key={p.id} {...tappable(() => explain(p))}>
      <span className="measure-day-v" style={{ flexDirection: 'column', gap: 2 }}>
        <b>{p.down ? L.sidecarDown : p.label}</b>
        <span>{p.down ? L.sidecarDownSub : p.message}</span>
      </span>
      <Icon name="chevronRight" className="chev" />
    </div>)}
  </div>
}
