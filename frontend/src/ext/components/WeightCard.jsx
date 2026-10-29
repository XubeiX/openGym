import { useStore } from '../../store/useStore.js'
import { fmtDate, fmtNum } from '../../lib/format.js'
import { dateLocale } from '../../lib/i18n.js'
import { weighInAt } from '../../lib/bodyweight.js'
import { bwSheet, goalSheet, bwDeltaColor, weighInsSheet } from '../../sheets.jsx'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import { Button, Segmented } from '../../components/ui.jsx'
import { weightMA } from '../lib/weight-ma.js'
import { extOf, setExt } from '../state.js'
import { L } from '../strings.js'

// The built-in body weight card (views/Home.jsx) with a Weigh-ins / MA7 / MA28 switch counted
// like ptv4's dashboard. The built-in one is turned off with its own Settings switch (S.showWeightCard).
export default function WeightCard() {
  const S = useStore(s => s.S)
  const avg = extOf(S).weightAvg
  const key = avg ? 'ma' + avg : 'w'
  const byDay = new Map(S.bodyweight.map(b => [b.d, b]))
  const series = weightMA(S.bodyweight).filter(r => r[key] != null)
    .map(r => ({ d: r.d, w: Math.round(r[key] * 100) / 100, t: weighInAt(byDay.get(r.d)) }))
  const last = series.at(-1), prev = series.at(-2)
  const delta = last && prev ? Math.round((last.w - prev.w) * 100) / 100 : null
  // MA to 0.01 like ptv4's dashboard; fmtNum would cut 83.96 to 84
  const fmt = v => avg ? v.toLocaleString(dateLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : fmtNum(v)
  const points = series.slice(-30).map(b => ({ t: b.t, y: b.w, d: b.d }))

  return <div className="card">
    <div className="row between bw-head" style={{ marginBottom: 6 }}>
      <h2 style={{ margin: 0 }}>{L.weight}{avg ? ` · MA${avg}` : ''}</h2>
      <div className="row" style={{ gap: 8 }}>
        <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : L.goal}</Button>
        <Button size="sm" icon="plus" onClick={() => bwSheet()}>{L.log}</Button>
      </div>
    </div>
    {!S.bodyweight.length ? <div className="muted small">{L.noWeighIns}</div> : <>
      {last ? <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
        <div className="big">{fmt(last.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></div>
        {!!delta && <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, last.w) }}>
          <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />
          {fmt(Math.abs(delta))}
        </span>}
        <span className="dim small" style={{ marginInlineStart: 'auto' }}>{fmtDate(last.d, true)}</span>
      </div> : <div className="muted small">{L.maMissing(avg)}</div>}
      {S.targetW && last && <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
        <Icon name="target" style={{ fontSize: 13 }} />
        <span>{L.goal} {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - last.w) < 0.05 ? L.goalReached
          : `${fmtNum(Math.abs(S.targetW - last.w))} ${S.unit} ${S.targetW > last.w ? L.toGain : L.toLose}`}</span>
      </div>}
      <div style={{ marginTop: 10 }}><Segmented className="seg-range" value={avg} onChange={v => setExt({ weightAvg: v })}
        options={[{ value: 0, label: L.weighIns }, { value: 7, label: 'MA7' }, { value: 28, label: 'MA28' }]} /></div>
      {points.length > 0 && <div className="chart" style={{ marginTop: 8 }}><LineChart points={points} h={130} unit={S.unit} goal={S.targetW} /></div>}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button size="sm" variant="ghost" trailingIcon="chevronRight" onClick={weighInsSheet}>{L.allWeighIns}</Button>
      </div>
    </>}
  </div>
}
