import { useStore } from '../../store/useStore.js'
import { Section, Row, Switch } from '../../components/ui.jsx'
import { extOf, setExt } from '../state.js'
import { L } from '../strings.js'

// Settings → Dodatki: which fork cards show on Home.
export default function ExtSettings() {
  const ext = extOf(useStore(s => s.S))
  return <Section title={L.onHome} footer={L.onHomeFooter}>
    <Row icon="scale" iconTint="var(--green)" title={L.weightCardTitle} subtitle={L.weightCardSub}>
      <Switch aria-label={L.weightCardTitle} checked={ext.homeWeight} onChange={v => setExt({ homeWeight: v })} />
    </Row>
    <Row icon="ruler" iconTint="var(--teal)" title={L.recentCardTitle} subtitle={L.recentCardSub}>
      <Switch aria-label={L.recentCardTitle} checked={ext.homeRecent} onChange={v => setExt({ homeRecent: v })} />
    </Row>
  </Section>
}
