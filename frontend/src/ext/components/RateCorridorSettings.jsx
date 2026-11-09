import { Section, Row, NumberField, Segmented } from '../../components/ui.jsx'
import { corridorOf, DEFAULT_CORRIDORS, DEFAULT_STALL_PCT } from '../lib/mass-rate.js'
import { setExt, setExtIn } from '../state.js'
import { L } from '../strings.js'

// Dodatki → Korytarze tempa: a range and a unit for each phase with a direction, phases not yet started included.
export default function RateCorridorSettings({ ext, unit }) {
  return <Section title={L.corridorsSection} footer={L.corridorsFooter}>
    {Object.keys(DEFAULT_CORRIDORS).map(type => {
      const c = corridorOf(ext, type), title = L.corridorTitles[type]
      const save = patch => setExtIn('rateCorridors', type, { ...c, ...patch }) // always the whole entry
      const bound = (key, label) => <Row title={label}>
        <span className="measure-input" style={{ maxWidth: 120 }}>
          <NumberField value={c[key]} aria-label={L.corridorField(title, label)} onChange={v => save({ [key]: v })} /><i>{c.by === 'w' ? unit : '%'}</i>
        </span>
      </Row>
      return <div key={type}>
        <Row title={title} subtitle={L.corridorPerWeek}>
          <Segmented className="seg-inline" value={c.by} onChange={by => save({ by })}
            options={[{ value: '%', label: '%' }, { value: 'w', label: unit }]} />
        </Row>
        {bound('lo', L.corridorFrom)}
        {bound('hi', L.corridorTo)}
      </div>
    })}
    <Row title={L.stallThreshold} subtitle={L.stallThresholdSub}>
      <span className="measure-input" style={{ maxWidth: 120 }}>
        <NumberField nullable value={ext.rateStallPct} placeholder={String(DEFAULT_STALL_PCT)} aria-label={L.stallThreshold}
          onChange={v => setExt({ rateStallPct: v ?? undefined })} /><i>%</i>
      </span>
    </Row>
  </Section>
}
