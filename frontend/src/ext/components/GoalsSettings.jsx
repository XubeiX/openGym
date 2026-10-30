import { useState } from 'react'
import { Section, Row, SelectRow, NumberField, Button, Segmented } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { usePtv4 } from '../lib/ptv4.js'
import { goalsOf, goalExercises, openProposals, withGoal, inWeeks } from '../lib/goals.js'
import { setExt } from '../state.js'
import { L } from '../strings.js'

// Dodatki → Cele: the goals (S.ext.goals), a form for a new one (weight × reps, which ptv4 turns into e1RM with
// the plan's RIR and body weight, or e1RM itself) and ptv4's proposals. The lifts to
// pick from and the proposals come from the sidecar; without it the saved goals still show and go.
export default function GoalsSettings({ ext }) {
  const goals = goalsOf(ext)
  const addGoal = goal => setExt({ goals: withGoal(goals, goal) })
  const removeGoal = name => setExt({ goals: goals.filter(g => g.name !== name) })
  const st = usePtv4(['lift_summary', 'goal_proposals'])
  const lifts = goalExercises(st.data?.lift_summary)
  const proposals = openProposals(st.data?.goal_proposals, goals)
  const [name, setName] = useState(null)
  const [kind, setKind] = useState('wr')
  const [e1rm, setE1rm] = useState(null)
  const [weight, setWeight] = useState(null)
  const [reps, setReps] = useState(null)
  const [deadline, setDeadline] = useState(() => inWeeks(10))
  const pick = lifts.includes(name) ? name : lifts[0]
  const what = kind === 'wr' ? (weight != null && reps > 0 && { weight, reps }) : (e1rm > 0 && { e1rm })
  const ok = pick && what && deadline > inWeeks(0)
  const add = () => { addGoal({ name: pick, ...what, deadline }); setE1rm(null); setWeight(null); setReps(null) }
  const kg = (value, set, label) => <span className="measure-input" style={{ maxWidth: 120 }}><NumberField nullable value={value} onChange={set} aria-label={label} /><i>kg</i></span>

  return <>
    <Section title={L.goalsSection} footer={L.goalsFooter}>
      {!goals.length && <Row title={L.goalsEmpty} />}
      {goals.map(g => <Row key={g.name} title={g.name} subtitle={L.goalLine(g)}>
        <button type="button" className="iconbtn" aria-label={L.goalRemove(g.name)} onClick={() => removeGoal(g.name)}><Icon name="trash" /></button>
      </Row>)}
    </Section>

    <Section title={L.goalNew} footer={lifts.length ? undefined : L.goalNoLifts}>
      {lifts.length > 0 && <>
        <SelectRow title={L.exercise} sheetTitle={L.chooseExercise} value={pick} onChange={setName}
          options={lifts.map(n => ({ value: n, label: n }))} search={{ match: (o, q) => o.label.toLowerCase().includes(q.toLowerCase()) }} />
        <Row title={L.goalKind}>
          <Segmented className="seg-inline" value={kind} onChange={setKind} options={[{ value: 'wr', label: L.goalWr }, { value: 'e1rm', label: L.goalE1rm }]} />
        </Row>
        {kind === 'wr' ? <>
          <Row title={L.goalWeight} subtitle={L.goalWeightSub}>{kg(weight, setWeight, L.goalWeight)}</Row>
          <Row title={L.goalReps}><span className="measure-input" style={{ maxWidth: 120 }}><NumberField nullable decimal={false} value={reps} onChange={setReps} aria-label={L.goalReps} /></span></Row>
        </> : <Row title={L.goalE1rm}>{kg(e1rm, setE1rm, L.goalE1rm)}</Row>}
        <Row title={L.goalDeadline}><input type="date" className="timef" value={deadline} min={inWeeks(0)} onChange={e => setDeadline(e.target.value)} /></Row>
        <div style={{ padding: '8px 16px 12px' }}><Button variant="primary" disabled={!ok} onClick={add}>{L.goalAdd}</Button></div>
      </>}
    </Section>

    {proposals.length > 0 && <Section title={L.proposals} footer={L.proposalsFooter}>
      {proposals.map(p => <Row key={p.exercise} title={p.exercise} subtitle={L.proposalLine(p)}>
        <Button size="sm" variant="ghost" icon="plus" onClick={() => addGoal({ name: p.exercise, e1rm: p.e1rm, deadline: p.deadline })}>{L.log}</Button>
      </Row>)}
    </Section>}
  </>
}
