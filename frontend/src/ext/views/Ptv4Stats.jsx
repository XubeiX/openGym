import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import LineChart from '../../components/LineChart.jsx'
import Icon from '../../components/Icon.jsx'
import { clearPtv4, usePtv4, at } from '../lib/ptv4.js'
import { L } from '../strings.js'

const COLORS = { tdee: 'var(--acc)', eat: 'var(--orange)', burn: 'var(--blue)', ma7: 'var(--acc)', ma28: 'var(--purple)', weight: 'var(--label-3)', protein: 'var(--acc)', range: 'var(--label-3)' }
const legend = keys => <div className="row" style={{ gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--label-2)', marginTop: 6 }}>
  {keys.map(k => <span key={k} className="row" style={{ gap: 5 }}><i style={{ width: 10, height: 3, borderRadius: 2, background: COLORS[k] }} />{L.series[k]}</span>)}
</div>
const line = (rows, date, key, color) => ({ color, points: rows.filter(r => r[key] != null).map(r => ({ t: at(r[date]), y: r[key] })) })
const kcal = v => v == null ? '–' : (v > 0 ? '+' : '') + v.toLocaleString('pl-PL') + ' kcal'

function Tile({ label, value, sub }) {
  return <div className="tile">
    <div className="l">{label}</div>
    <div className="v" style={{ fontSize: 22 }}>{value}</div>
    {sub && <div className="small muted" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
}

// Liczby: the dashboard's kpi tiles, minus MA7 and the rate (on Home), as ptv4 words them.
function Numbers({ k }) {
  return <div className="tiles">
    <Tile label={L.tiles.tdee} value={k.tdee_txt} sub={k.eat_txt} />
    <Tile label={L.tiles.balAdapt} value={k.bal_adapt_txt} sub={k.bal_adapt_sub} />
    <Tile label={L.tiles.balWatch} value={k.bal_watch_txt} sub={k.bal_watch_sub} />
    <Tile label={L.tiles.protein} value={k.protein_txt} sub={k.protein_sub} />
    <Tile label={L.tiles.sleep} value={k.sleep_txt} sub={L.sleepSub} />
    <Tile label={L.tiles.prs} value={k.prs28} sub={k.sessions_txt} />
  </div>
}

// Masa i energia: TDEE with its range, eat and burn by week; weight with MA7 / MA28; protein by week.
function Energy({ energy, body }) {
  const unit = useStore(s => s.S.unit)
  const wk = energy.filter(r => r.tdee != null).at(-1)
  const last = energy.at(-1) || {}
  const range = r => Array.isArray(r.tdee_range) ? r.tdee_range.map(v => Math.round(v).toLocaleString('pl-PL')).join('–') : '–'
  const anchor = energy.filter(r => r.tdee != null).map(r => ({ t: at(r.week_end), y: r.tdee, note: `${L.series.tdee} ${r.tdee} · ${range(r)}` }))
  return <>
    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.tdeeCard}</h2><span className="small muted">{L.byPtv4}</span></div>
      {wk ? <>
        <div className="big" style={{ marginTop: 6 }}>{wk.tdee.toLocaleString('pl-PL')} <span className="muted" style={{ fontSize: '1rem' }}>kcal</span></div>
        <div className="small muted">{L.tdeeWeek(range(wk), wk.week_end)}</div>
        <div className="chart" style={{ marginTop: 8 }}>
          <LineChart points={anchor} h={150} unit="kcal" series={[line(energy, 'week_end', 'tdee', COLORS.tdee), line(energy, 'week_end', 'eat', COLORS.eat), line(energy, 'week_end', 'burn', COLORS.burn)]} />
        </div>
        {legend(['tdee', 'eat', 'burn'])}
        <div className="row between small" style={{ marginTop: 10 }}><span>{L.balAdapt} (28 dni)</span><b>{kcal(last.bal_adapt_28)}</b></div>
        <div className="row between small" style={{ marginTop: 4 }}><span>{L.balWatch} (28 dni)</span><b>{kcal(last.bal_watch_28)}</b></div>
        {last.bal_uncertain && <div className="row small" style={{ gap: 6, marginTop: 8, color: 'var(--yellow)' }}><Icon name="info" />{L.uncertain}: {last.bal_uncertain_why}</div>}
      </> : <div className="muted small">{L.noData}</div>}
      <div className="small muted" style={{ marginTop: 10 }}>{L.tdeeCaption}</div>
    </div>

    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.weightHistory}</h2><span className="small muted">{L.byPtv4}</span></div>
      <div className="chart" style={{ marginTop: 8 }}>
        <LineChart points={body.filter(r => r.ma7 != null).map(r => ({ t: at(r.date), y: r.ma7 }))} h={150} unit={unit}
          series={[line(body, 'date', 'ma7', COLORS.ma7), line(body, 'date', 'ma28', COLORS.ma28), line(body, 'date', 'weight', COLORS.weight)]} />
      </div>
      {legend(['ma7', 'ma28', 'weight'])}
    </div>

    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.proteinWeekly}</h2><span className="small muted">{L.byPtv4}</span></div>
      <div className="chart" style={{ marginTop: 8 }}>
        <LineChart points={energy.filter(r => r.protein != null).map(r => ({ t: at(r.week_end), y: r.protein, note: r.protein_min != null ? `${L.series.range} ${r.protein_min}–${r.protein_max} g` : undefined }))} h={130} unit="g"
          series={[line(energy, 'week_end', 'protein_min', COLORS.range), line(energy, 'week_end', 'protein_max', COLORS.range), line(energy, 'week_end', 'protein', COLORS.protein)]} />
      </div>
      {legend(['protein', 'range'])}
    </div>
  </>
}

// /ptv4: Statystyki+, ptv4's numbers in openGym.
export default function Ptv4Stats() {
  const nav = useNavigate()
  useEffect(() => { clearPtv4() }, [])
  const st = usePtv4(['kpi', 'energy', 'body'])
  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav(-1)} aria-label="Wstecz"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{L.statsTitle}</h1><div className="sub">{L.statsSub}</div></div>
    </div>
    {st.loading && <div className="card muted small">{L.loading}</div>}
    {st.error && <div className="card small" style={{ color: 'var(--red)' }}>{L.ptv4Error}: {st.error}</div>}
    {st.data && <>
      <h2 className="ext-sec">{L.sections.numbers}</h2>
      {st.data.kpi[0] ? <Numbers k={st.data.kpi[0]} /> : <div className="card muted small">{L.noData}</div>}
      <h2 className="ext-sec">{L.sections.energy}</h2>
      <Energy energy={st.data.energy} body={st.data.body} />
    </>}
  </div>
}
