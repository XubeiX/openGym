import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { fmtDate, todayISO } from '../../lib/format.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { bwSheet } from '../../sheets.jsx'
import { measurementLogSheet } from '../../views/Measurements.jsx'
import { Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { missingChecks } from '../lib/checks.js'
import { extOf, setExt } from '../state.js'
import { L } from '../strings.js'

const open = item => {
  if (item.action === 'weigh') bwSheet()
  else if (item.action === 'log') measurementLogSheet(item.day)
  else useUI.getState().toast(L.garminInfo, { ms: 6000 })
}

// Top of Home: only what is missing, one row each; gone once everything is in.
export default function DataCheckCard() {
  const S = useStore(s => s.S)
  const missing = missingChecks(S, new Date(), extOf(S))
  if (!missing.length) return null
  return <div className="card">
    <div className="row between" style={{ marginBottom: 6 }}>
      <h2 style={{ margin: 0 }}>{L.missingTitle}</h2>
      <Button size="sm" variant="ghost" onClick={() => setExt({ snooze: todayISO() })}>{L.snooze}</Button>
    </div>
    {missing.map(m => <div className="measure-day tappable" key={m.id} {...tappable(() => open(m))}>
      <span className="measure-day-v" style={{ flexDirection: 'column', gap: 2 }}>
        <b>{L.check[m.id]}</b>
        <span>{fmtDate(m.day, true)}{m.detail ? ' · ' + (m.id === 'fitatu' ? L.fitatuDetail(m.detail) : m.detail) : ''}</span>
      </span>
      <Icon name={m.action === 'info' ? 'info' : 'pencil'} className="chev" />
    </div>)}
  </div>
}
