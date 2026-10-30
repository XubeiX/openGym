import { useState } from 'react'
import { Section, Row, SelectRow, NumberField, Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import { usePtv4 } from '../lib/ptv4.js'
import { goalsOf, goalExercises, openProposals, withGoal, inWeeks } from '../lib/goals.js'
import { setExt } from '../state.js'
import { L } from '../strings.js'

// Dodatki → Cele: the e1RM goals (S.ext.goals), a form for a new one and ptv4's proposals. The lifts to
// pick from and the proposals come from the sidecar; without it the saved goals still show and go.
export default function GoalsSettings({ ext }) {
  const goals = goalsOf(ext)
  const addGoal = goal => setExt({ goals: withGoal(goals, goal) })
  const removeGoal = name => setExt({ goals: goals.filter(g => g.name !== name) })
  const st = usePtv4(['lift_summary', 'goal_proposals'])
  const lifts = goalExercises(st.data?.lift_summary)
  const proposals = openProposals(st.data?.goal_proposals, goals)
  const [name, setName] = useState(null)
  const [e1rm, setE1rm] = useState(null)
  const [deadline, setDeadline] = useState(() => inWeeks(10))
  const pick = lifts.includes(name) ? name : lifts[0]
  const ok = pick && e1rm > 0 && deadline > inWeeks(0)
  const add = () => { addGoal({ name: pick, e1rm, deadline }); setE1rm(null) }

  return <>
    <Section title={L.goalsSection} footer={L.goalsFooter}>
      {!goals.length && <Row title={L.goalsEmpty} />}
      {goals.map(g => <Row key={g.name} title={g.name} subtitle={L.goalLine(g.e1rm, g.deadline)}>
        <button type="button" className="iconbtn" aria-label={L.goalRemove(g.name)} onClick={() => removeGoal(g.name)}><Icon name="trash" /></button>
      </Row>)}
    </Section>

    <Section title={L.goalNew} footer={lifts.length ? undefined : L.goalNoLifts}>
      {lifts.length > 0 && <>
        <SelectRow title={L.exercise} sheetTitle={L.chooseExercise} value={pick} onChange={setName}
          options={lifts.map(n => ({ value: n, label: n }))} search={{ match: (o, q) => o.label.toLowerCase().includes(q.toLowerCase()) }} />
        <Row title={L.goalE1rm}><span className="measure-input" style={{ maxWidth: 120 }}><NumberField nullable value={e1rm} onChange={setE1rm} aria-label={L.goalE1rm} /><i>kg</i></span></Row>
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
