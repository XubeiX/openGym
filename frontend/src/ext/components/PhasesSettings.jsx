import { useState } from 'react'
import { Section, Row, Button, Segmented } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { phasesOf, phaseError } from '../lib/phases.js'
import { setExt } from '../state.js'
import { L } from '../strings.js'

const BLANK = { type: 'redukcja', start: '', end: '' }
const same = (a, b) => a.type === b.type && a.start === b.start && (a.end || '') === (b.end || '')

// Dodatki → Fazy: the list (newest first) with a form under it that adds a phase or corrects the picked one.
export default function PhasesSettings({ ext }) {
  const phases = phasesOf(ext)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const others = editing ? phases.filter(p => !same(p, editing)) : phases
  const error = phaseError(form, others)
  const reset = () => { setForm(BLANK); setEditing(null) }
  const save = () => {
    setExt({ phases: [...others, { type: form.type, start: form.start, ...(form.end && { end: form.end }) }] })
    reset()
  }
  const remove = p => { setExt({ phases: phases.filter(x => !same(x, p)) }); if (editing && same(editing, p)) reset() }
  const edit = p => { setForm({ ...BLANK, ...p }); setEditing(p) }
  const date = (key, label) => <Row title={label}>
    <input type="date" className="timef" aria-label={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
  </Row>

  return <>
    <Section title={L.phasesSection} footer={L.phasesFooter}>
      {!phases.length && <Row title={L.phasesEmpty} />}
      {[...phases].sort((a, b) => b.start.localeCompare(a.start)).map(p => <Row key={p.type + p.start + p.end} title={L.phaseTitles[p.type]} subtitle={L.phaseDates(p)}>
        <button type="button" className="iconbtn" aria-label={L.phaseEdit(L.phaseTitles[p.type])} onClick={() => edit(p)}><Icon name="pencil" /></button>
        <button type="button" className="iconbtn" aria-label={L.phaseRemove(L.phaseTitles[p.type])} onClick={() => remove(p)}><Icon name="trash" /></button>
      </Row>)}
    </Section>

    <Section title={editing ? L.phaseEditing : L.phaseNew}
      footer={L.phaseErrors[error] && <span style={{ color: 'var(--red)' }}>{L.phaseErrors[error]}</span>}>
      <Row title={L.phaseType}>
        <Segmented className="seg-inline" value={form.type} onChange={type => setForm({ ...form, type })}
          options={Object.entries(L.phaseTitles).map(([value, label]) => ({ value, label }))} />
      </Row>
      {date('start', L.phaseStart)}
      {date('end', L.phaseEnd)}
      <div className="row" style={{ padding: '8px 16px 12px', gap: 8 }}>
        <Button variant="primary" disabled={!!error} onClick={save}>{editing ? L.phaseSave : L.phaseAdd}</Button>
        {editing && <Button variant="ghost" onClick={reset}>{L.phaseCancel}</Button>}
      </div>
    </Section>
  </>
}
