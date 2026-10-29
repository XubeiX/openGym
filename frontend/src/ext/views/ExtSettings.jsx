import { useStore } from '../../store/useStore.js'
import { DAYS } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { Section, Row, Switch, Segmented, SelectRow } from '../../components/ui.jsx'
import { CHECKS, checksOf, fieldsOf } from '../lib/checks.js'
import { extOf, setExt, setExtIn } from '../state.js'
import { L } from '../strings.js'

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${h}:00` }))
const EVERY = [3, 5, 7, 10, 14, 30].map(n => ({ value: n, label: String(n) }))
const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday first

function DayChips({ days, onChange }) {
  const flip = d => onChange(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort())
  return <div className="chips" style={{ padding: '4px 0 8px' }}>
    {WEEK.map(d => <button key={d} type="button" className={'chip' + (days.includes(d) ? ' on' : '')} aria-pressed={days.includes(d)} onClick={() => flip(d)}>{t(DAYS[d])}</button>)}
  </div>
}

// Settings → Look & Home → Dodatki: which fork cards show on Home, and what the data-check card asks for.
export default function ExtSettings() {
  const S = useStore(s => s.S)
  const ext = extOf(S)
  const checks = checksOf(ext), fields = fieldsOf(ext)
  const setCheck = (id, patch) => setExtIn('checks', id, patch)
  const fieldOptions = [...new Set([...(S.customMeasurements || []).map(c => c.name), ...Object.values(fields)])]
    .map(name => ({ value: name, label: (S.customMeasurements || []).some(c => c.name === name) ? name : `${name} ${L.noField}` }))

  return <>
    <Section title={L.onHome} footer={L.onHomeFooter}>
      <Row icon="checkCircle" iconTint="var(--orange)" title={L.checksCardTitle} subtitle={L.checksCardSub}>
        <Switch aria-label={L.checksCardTitle} checked={ext.homeChecks} onChange={v => setExt({ homeChecks: v })} />
      </Row>
      <Row icon="sparkles" iconTint="var(--purple)" title={L.todayCardTitle} subtitle={L.todayCardSub}>
        <Switch aria-label={L.todayCardTitle} checked={ext.homeToday} onChange={v => setExt({ homeToday: v })} />
      </Row>
      <Row icon="scale" iconTint="var(--green)" title={L.weightCardTitle} subtitle={L.weightCardSub}>
        <Switch aria-label={L.weightCardTitle} checked={ext.homeWeight} onChange={v => setExt({ homeWeight: v })} />
      </Row>
      <Row icon="ruler" iconTint="var(--teal)" title={L.recentCardTitle} subtitle={L.recentCardSub}>
        <Switch aria-label={L.recentCardTitle} checked={ext.homeRecent} onChange={v => setExt({ homeRecent: v })} />
      </Row>
    </Section>

    {ext.homeChecks && <Section title={L.checksSection} footer={L.checksFooter}>
      {Object.keys(CHECKS).map(id => {
        const c = checks[id]
        return <div key={id}>
          <Row title={L.check[id]} subtitle={L.checkSub[id]}>
            <Switch aria-label={L.check[id]} checked={c.on} onChange={v => setCheck(id, { on: v })} />
          </Row>
          {c.on && id === 'weigh' && <>
            <Row title={L.onDays}><DayChips days={c.days} onChange={days => setCheck(id, { days })} /></Row>
            <SelectRow title={L.fromHour} value={c.after} options={HOURS} onChange={after => setCheck(id, { after })} />
          </>}
          {c.on && id === 'sleep' && <SelectRow title={L.fromHour} value={c.after} options={HOURS} onChange={after => setCheck(id, { after })} />}
          {c.on && id === 'waist' && <>
            <Row title={L.waistMode}>
              <Segmented className="seg-inline" value={c.everyDays > 0 ? 'every' : 'weekday'}
                onChange={v => setCheck(id, { everyDays: v === 'every' ? 7 : 0 })}
                options={[{ value: 'every', label: L.everyN }, { value: 'weekday', label: L.onWeekday }]} />
            </Row>
            {c.everyDays > 0
              ? <SelectRow title={L.everyDays} value={c.everyDays} options={EVERY} onChange={everyDays => setCheck(id, { everyDays })} />
              : <Row title={L.onDays}><DayChips days={c.days} onChange={days => setCheck(id, { days })} /></Row>}
          </>}
        </div>
      })}
    </Section>}

    {ext.homeChecks && <Section title={L.fieldsSection} footer={L.fieldsFooter}>
      {Object.keys(fields).map(role => <SelectRow key={role} title={L.field[role]} value={fields[role]} options={fieldOptions}
        onChange={name => setExtIn('fields', role, name)} />)}
    </Section>}
  </>
}
