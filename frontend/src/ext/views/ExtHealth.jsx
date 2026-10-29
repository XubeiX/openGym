import { Section, Row } from '../../components/ui.jsx'
import { useHealth } from '../lib/health.js'
import { L } from '../strings.js'

// Settings → Data & backup → Stan integracji (hook in Settings.jsx).
// Every integration the sidecar checks, the working ones too: ✓ ok, ! broken (with its README section), ? unknown.
export default function ExtHealth() {
  const h = useHealth()
  if (!h.down && !h.items) return null // not ptv4's profile, signed out or offline: nothing to show
  const mark = ok => ok === true ? ['checkCircle', 'var(--green)'] : ok === false ? ['info', 'var(--red)'] : ['info', 'var(--label-3)']
  return <Section title={L.healthSection} footer={L.healthFooter}>
    {h.down && <Row icon="info" iconTint="var(--red)" title={L.sidecarDown} subtitle={L.sidecarDownMsg} />}
    {(h.items || []).map(i => { const [icon, tint] = mark(i.ok); return <Row key={i.id} icon={icon} iconTint={tint} title={i.label}
      subtitle={i.message + (i.ok === false && i.help ? ` ${L.readme}: „${i.help}”.` : '')} /> })}
  </Section>
}
