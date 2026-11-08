import { Section, Row, NumberField } from '../../components/ui.jsx'
import { usePtv4 } from '../lib/ptv4.js'
import { guardLifts, guardOptions, flipLift, withThreshold } from '../lib/guard.js'
import { setExt } from '../state.js'
import { L } from '../strings.js'

// Dodatki → Strażnik siły: which lifts it guards (from ptv4's active ones) and from what drop.
export default function GuardSettings({ ext }) {
  const saved = ext.strengthGuard
  const lifts = guardLifts(ext)
  const st = usePtv4(['lift_summary'])
  const flip = name => setExt({ strengthGuard: { ...saved, lifts: flipLift(lifts, name) } })

  return <Section title={L.guardSection} footer={L.guardFooter}>
    <Row title={L.guardLifts} subtitle={L.guardLiftsSub} />
    <div className="chips wrap ext-chips" style={{ padding: '0 16px 10px' }}>
      {guardOptions(st.data?.lift_summary, lifts).map(n => <button key={n} type="button" className={'chip' + (lifts.includes(n) ? ' on' : '')}
        aria-pressed={lifts.includes(n)} onClick={() => flip(n)}>{n}</button>)}
    </div>
    <Row title={L.guardThreshold}>
      <span className="measure-input" style={{ maxWidth: 120 }}>
        <NumberField nullable value={saved?.threshold} placeholder="5" aria-label={L.guardThreshold}
          onChange={v => setExt({ strengthGuard: withThreshold(saved, v) })} /><i>%</i>
      </span>
    </Row>
  </Section>
}
