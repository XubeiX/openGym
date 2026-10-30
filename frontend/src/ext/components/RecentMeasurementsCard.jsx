import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import { fmtDate, todayISO } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { enabledMeasurementFields, measurementUnit, measurementUnitLabel } from '../../lib/measurements.js'
import { fmtValue, measurementLogSheet, shownValue } from '../../views/Measurements.jsx'
import { tappable } from '../../lib/use-sheet-keyboard.js'
import { Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { recentMeasurementDays } from '../lib/measurements.js'
import { L } from '../strings.js'

// The last five days of daily measurements (calories, sleep, steps…), each row opening that
// day's check-in — yesterday's totals are filled in from here, not from Stats → Measurements.
export default function RecentMeasurementsCard() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const days = recentMeasurementDays(S, todayISO())
  if (!days.length) return null
  // Only the fields used in those days: a waist taken once a month would be a dash on every row.
  const fields = enabledMeasurementFields(S).filter(f => days.some(x => shownValue(x.entry, f, S.unit) != null))
  return <div className="card">
    <div className="row between" style={{ marginBottom: 6 }}>
      <h2 style={{ margin: 0 }}>{L.measurements}</h2>
      <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={() => nav('/measurements')}>{L.measurementHistory}</Button>
    </div>
    {days.map(({ d, entry }) => <div className="measure-day tappable" key={d} {...tappable(() => measurementLogSheet(d))}>
      <b>{fmtDate(d, true)}</b>
      <span className="measure-day-v">{fields.map(f => {
        const v = shownValue(entry, f, S.unit)
        return <span key={f.key} className={v == null ? 'dim' : ''}>{t(f.label)} <b>{v == null ? '–' : fmtValue(v, measurementUnitLabel(measurementUnit(S.unit, f)))}</b></span>
      })}</span>
      <Icon name="pencil" className="chev" />
    </div>)}
  </div>
}
