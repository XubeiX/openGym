import { useStore } from '../../store/useStore.js'
import { DAYS } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { Section, Row, Switch, Segmented, SelectRow } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { useListReorder, moved } from '../../lib/use-list-reorder.js'
import { layoutOf, withSection } from '../layout.js'
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

const SECTIONS = {
  home: {
    checks: { title: L.checksCardTitle, sub: L.checksCardSub, icon: 'checkCircle', tint: 'var(--orange)' },
    today: { title: L.todayCardTitle, sub: L.todayCardSub, icon: 'sparkles', tint: 'var(--purple)', tiles: L.todayTiles },
    weight: { title: L.weightCardTitle, sub: L.weightCardSub, icon: 'scale', tint: 'var(--green)' },
    recent: { title: L.recentCardTitle, sub: L.recentCardSub, icon: 'ruler', tint: 'var(--teal)' },
  },
  stats: {
    numbers: { title: L.sections.numbers, icon: 'chartLine', tint: 'var(--blue)', tiles: L.numbersTiles },
    energy: { title: L.sections.energy, icon: 'flame', tint: 'var(--orange)', tiles: L.energyTiles },
    recovery: { title: L.sections.recovery, icon: 'heart', tint: 'var(--red)', tiles: L.recoveryTiles },
    strength: { title: L.sections.strength, icon: 'barbell', tint: 'var(--purple)' },
    volume: { title: L.sections.volume, icon: 'grid', tint: 'var(--teal)' },
    daily: { title: L.sections.daily, icon: 'calendar', tint: 'var(--green)', tiles: L.dailyTiles },
  },
}

// One reorderable list: a section per row with its switch and handle, its tiles as chips under it.
function LayoutList({ ext, where, title, footer }) {
  const list = layoutOf(ext, where)
  const save = l => setExt({ layout: { ...(ext.layout || {}), [where]: l } })
  const r = useListReorder(list.length, (from, to) => save(moved(list, from, to)))
  return <Section title={title} footer={footer}>
    <div ref={r.listRef}>{list.map((sec, i) => {
      const d = SECTIONS[where][sec.id]
      return <div key={sec.id} data-reorder-row style={r.rowStyle(i)}>
        <Row icon={d.icon} iconTint={d.tint} title={d.title} subtitle={d.sub}>
          <Switch aria-label={d.title} checked={sec.on} onChange={v => save(withSection(ext, where, sec.id, { on: v }))} />
          <button className="plan-handle" aria-label={L.moveSection(d.title)} {...r.handle(i)}><Icon name="chevronsUpDown" /></button>
        </Row>
        {sec.on && d.tiles && <div className="chips ext-chips" style={{ padding: '0 16px 10px' }}>
          {Object.entries(d.tiles).map(([id, name]) => <button key={id} type="button" className={'chip' + (sec.tiles[id] ? ' on' : '')}
            aria-pressed={sec.tiles[id]} onClick={() => save(withSection(ext, where, sec.id, { tiles: { [id]: !sec.tiles[id] } }))}>{name}</button>)}
        </div>}
      </div>
    })}</div>
  </Section>
}

// Settings → Look & Home → Dodatki: which fork cards show on Home, and what the data-check card asks for.
export default function ExtSettings() {
  const S = useStore(s => s.S)
  const ext = extOf(S)
  const checks = checksOf(ext), fields = fieldsOf(ext)
  const setCheck = (id, patch) => setExtIn('checks', id, patch)
  const checksOn = layoutOf(ext, 'home').find(c => c.id === 'checks').on
  const fieldOptions = [...new Set([...(S.customMeasurements || []).map(c => c.name), ...Object.values(fields)])]
    .map(name => ({ value: name, label: (S.customMeasurements || []).some(c => c.name === name) ? name : `${name} ${L.noField}` }))

  return <>
    <LayoutList ext={ext} where="home" title={L.onHome} footer={L.layoutHomeFooter} />
    <LayoutList ext={ext} where="stats" title={L.statsTitle} footer={L.layoutStatsFooter} />

    {checksOn && <Section title={L.checksSection} footer={L.checksFooter}>
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

    {checksOn && <Section title={L.fieldsSection} footer={L.fieldsFooter}>
      {Object.keys(fields).map(role => <SelectRow key={role} title={L.field[role]} value={fields[role]} options={fieldOptions}
        onChange={name => setExtIn('fields', role, name)} />)}
    </Section>}
  </>
}
