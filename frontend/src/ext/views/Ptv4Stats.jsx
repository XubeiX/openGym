import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import { usePtv4, at } from '../lib/ptv4.js'
import ExtChart from '../components/ExtChart.jsx'
import { L } from '../strings.js'
import { layoutOf } from '../layout.js'
import { extOf } from '../state.js'

const C = { s1: 'var(--ext-s1)', s2: 'var(--ext-s2)', s3: 'var(--ext-s3)', neutral: 'var(--ext-neutral)' }
// rows → a chart series of `key` by `date`
const pts = (rows, date, key) => rows.filter(r => r[key] != null).map(r => ({ t: at(r[date]), y: r[key] }))
const series = (key, rows, date, field, color, kind) => ({ key, name: L.series[key], color, kind, points: pts(rows, date, field) })
const kcal = v => v == null ? '–' : (v > 0 ? '+' : '') + v.toLocaleString('pl-PL') + ' kcal'

function Tile({ label, value, sub }) {
  return <div className="tile">
    <div className="l">{label}</div>
    <div className="v">{value}</div>
    {sub && <div className="small muted" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
}

// Liczby: the dashboard's kpi tiles, minus MA7 and the rate (on Home), as ptv4 words them.
function Numbers({ k, tiles }) {
  const all = {
    tdee: [k.tdee_txt, k.eat_txt], balAdapt: [k.bal_adapt_txt, k.bal_adapt_sub], balWatch: [k.bal_watch_txt, k.bal_watch_sub],
    protein: [k.protein_txt, k.protein_sub], sleep: [k.sleep_txt, L.sleepSub], prs: [k.prs28, k.sessions_txt],
  }
  return <div className="ext-tiles">
    {Object.entries(all).filter(([id]) => tiles[id] !== false).map(([id, [v, sub]]) => <Tile key={id} label={L.tiles[id]} value={v} sub={sub} />)}
  </div>
}

// Masa i energia: TDEE with its range, eat and burn by week; weight with MA7 / MA28; protein by week.
function Energy({ energy, body, tiles }) {
  const unit = useStore(s => s.S.unit)
  const wk = energy.filter(r => r.tdee != null).at(-1)
  const last = energy.at(-1) || {}
  const range = r => Array.isArray(r.tdee_range) ? r.tdee_range.map(v => Math.round(v).toLocaleString('pl-PL')).join('–') : '–'
  const tdeeBand = { key: 'tdeeRange', name: L.series.tdeeRange, color: C.s1,
    points: energy.filter(r => Array.isArray(r.tdee_range)).map(r => ({ t: at(r.week_end), lo: r.tdee_range[0], hi: r.tdee_range[1] })) }
  const proteinBand = { key: 'range', name: L.series.range, color: C.neutral,
    points: energy.filter(r => r.protein_min != null).map(r => ({ t: at(r.week_end), lo: r.protein_min, hi: r.protein_max })) }
  const kcalFmt = v => Math.round(v).toLocaleString('pl-PL')
  return <>
    {tiles.tdeeCard !== false && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.tdeeCard}</h2><span className="small muted">{L.byPtv4}</span></div>
      {wk ? <>
        <div className="big" style={{ marginTop: 6 }}>{wk.tdee.toLocaleString('pl-PL')} <span className="muted" style={{ fontSize: '1rem' }}>kcal</span></div>
        <div className="small muted">{L.tdeeWeek(range(wk), wk.week_end)}</div>
        <div style={{ marginTop: 10 }}>
          <ExtChart h={200} unit="kcal" fmt={kcalFmt} bands={[tdeeBand]}
            series={[series('tdee', energy, 'week_end', 'tdee', C.s1), series('eat', energy, 'week_end', 'eat', C.s2), series('burn', energy, 'week_end', 'burn', C.s3)]} />
        </div>
        <div className="row between small" style={{ marginTop: 10 }}><span>{L.balAdapt} (28 dni)</span><b>{kcal(last.bal_adapt_28)}</b></div>
        <div className="row between small" style={{ marginTop: 4 }}><span>{L.balWatch} (28 dni)</span><b>{kcal(last.bal_watch_28)}</b></div>
        {last.bal_uncertain && <div className="row small" style={{ gap: 6, marginTop: 8, color: 'var(--yellow)' }}><Icon name="info" />{L.uncertain}: {last.bal_uncertain_why}</div>}
      </> : <div className="muted small">{L.noData}</div>}
      <div className="small muted" style={{ marginTop: 10 }}>{L.tdeeCaption}</div>
    </div>}

    {tiles.weight !== false && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.weightHistory}</h2><span className="small muted">{L.byPtv4}</span></div>
      <div style={{ marginTop: 10 }}>
        <ExtChart h={200} unit={unit}
          series={[series('weight', body, 'date', 'weight', C.neutral, 'dots'), series('ma28', body, 'date', 'ma28', C.s2), series('ma7', body, 'date', 'ma7', C.s1)]} />
      </div>
    </div>}

    {tiles.protein !== false && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.proteinWeekly}</h2><span className="small muted">{L.byPtv4}</span></div>
      <div style={{ marginTop: 10 }}>
        <ExtChart h={180} unit="g" fmt={kcalFmt} bands={[proteinBand]} series={[series('protein', energy, 'week_end', 'protein', C.s1)]} />
      </div>
    </div>}
  </>
}

// /ptv4: Statystyki+, ptv4's numbers in openGym.
export default function Ptv4Stats() {
  const nav = useNavigate()
  const st = usePtv4(['kpi', 'energy', 'body'], { fresh: true })
  const layout = layoutOf(extOf(useStore(s => s.S)), 'stats')
  return <div className="ext-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav(-1)} aria-label="Wstecz"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{L.statsTitle}</h1><div className="sub">{L.statsSub}</div></div>
    </div>
    {(st.loading || st.stale) && <div className="small muted" style={{ margin: '0 4px 8px' }}>{st.loading ? L.loading : L.refreshing}</div>}
    {st.error && <div className="card small" style={{ color: 'var(--red)' }}>{L.ptv4Error}: {st.error}</div>}
    {st.data && layout.filter(sec => sec.on).map(sec => <div key={sec.id}>
      <h2 className="ext-sec">{L.sections[sec.id]}</h2>
      {sec.id === 'numbers' && (st.data.kpi[0] ? <Numbers k={st.data.kpi[0]} tiles={sec.tiles} /> : <div className="card muted small">{L.noData}</div>)}
      {sec.id === 'energy' && <Energy energy={st.data.energy} body={st.data.body} tiles={sec.tiles} />}
    </div>)}
  </div>
}
