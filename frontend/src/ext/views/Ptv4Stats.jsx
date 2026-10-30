import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import { Segmented, SelectRow } from '../../components/ui.jsx'
import { usePtv4, at } from '../lib/ptv4.js'
import ExtChart from '../components/ExtChart.jsx'
import { L } from '../strings.js'
import { layoutOf } from '../layout.js'
import { extOf, setExtIn } from '../state.js'

// A chart's time window; a year at most, older is history.
const RANGES = { '1M': 31, '3M': 92, '1Y': 365 }
const since = (rows, date, days) => { const cut = Date.now() - days * 86400000; return rows.filter(r => at(r[date]) >= cut) }

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

// A chart's own 1M / 3M / 1Y switch, as on openGym's body-weight card; saved per chart in
// S.ext.chartRange (3M by default). Liczby keep ptv4's own windows.
function useRange(id) {
  const r = extOf(useStore(s => s.S)).chartRange?.[id]
  return RANGES[r] ? r : '3M'
}
const RangeSwitch = ({ id, value }) => <Segmented className="seg-range" value={value} onChange={v => setExtIn('chartRange', id, v)}
  options={Object.keys(RANGES).map(v => ({ value: v, label: v }))} />

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
  const rt = useRange('tdee'), rw = useRange('weight'), rp = useRange('protein')
  const eT = since(energy, 'week_end', RANGES[rt]), eP = since(energy, 'week_end', RANGES[rp]), bW = since(body, 'date', RANGES[rw])
  const inRange = (band, rows) => ({ ...band, points: band.points.filter(p => rows.some(r => at(r.week_end) === p.t)) })
  return <>
    {tiles.tdeeCard !== false && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.tdeeCard}</h2><span className="small muted">{L.byPtv4}</span></div>
      {wk ? <>
        <div className="big" style={{ marginTop: 6 }}>{wk.tdee.toLocaleString('pl-PL')} <span className="muted" style={{ fontSize: '1rem' }}>kcal</span></div>
        <div className="small muted">{L.tdeeWeek(range(wk), wk.week_end)}</div>
        <div style={{ marginTop: 10 }}>
          <RangeSwitch id="tdee" value={rt} />
          <ExtChart h={200} unit="kcal" fmt={kcalFmt} bands={[inRange(tdeeBand, eT)]}
            series={[series('tdee', eT, 'week_end', 'tdee', C.s1), series('eat', eT, 'week_end', 'eat', C.s2), series('burn', eT, 'week_end', 'burn', C.s3)]} />
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
        <RangeSwitch id="weight" value={rw} />
        <ExtChart h={200} unit={unit}
          series={[series('weight', bW, 'date', 'weight', C.neutral, 'dots'), series('ma28', bW, 'date', 'ma28', C.s2), series('ma7', bW, 'date', 'ma7', C.s1)]} />
      </div>
    </div>}

    {tiles.protein !== false && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{L.proteinWeekly}</h2><span className="small muted">{L.byPtv4}</span></div>
      <div style={{ marginTop: 10 }}>
        <RangeSwitch id="protein" value={rp} />
        <ExtChart h={180} unit="g" fmt={kcalFmt} bands={[inRange(proteinBand, eP)]} series={[series('protein', eP, 'week_end', 'protein', C.s1)]} />
      </div>
    </div>}
  </>
}

// Regeneracja: the watch's tiles (garmin_kpi) and day-by-day charts (garmin_daily: HRV 7-day mean and
// norm band, the resting-HR norm, all from ptv4), then Etap 3's "Readiness a wynik" (readiness).
function Recovery({ k, daily, perf, tiles }) {
  const rr = useRange('readiness'), rh = useRange('hrv'), rt = useRange('rhr')
  const dR = since(daily, 'date', RANGES[rr]), dH = since(daily, 'date', RANGES[rh]), dT = since(daily, 'date', RANGES[rt])
  const int = v => Math.round(v).toLocaleString('pl-PL')
  const kpi = { readiness: [k?.ready_txt, k?.ready_sub], hrv: [k?.hrv_txt, k?.hrv_sub], rhr: [k?.rhr_txt, k?.rhr_sub], bb: [k?.bb_txt, k?.bb_sub] }
  const card = (id, title, note, chart) => tiles[id] !== false && <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{title}</h2><span className="small muted">{L.byPtv4}</span></div>
    <div className="small muted" style={{ marginTop: 4 }}>{note}</div>
    <div style={{ marginTop: 10 }}>{chart}</div>
  </div>
  const hrvBand = { key: 'hrvNorm', name: L.series.hrvNorm, color: C.neutral,
    points: dH.filter(r => r.hrv_norm_lo != null).map(r => ({ t: at(r.date), lo: r.hrv_norm_lo, hi: r.hrv_norm_hi })) }
  return <>
    {k && <div className="ext-tiles">
      {Object.entries(kpi).filter(([id]) => tiles[id] !== false).map(([id, [v, sub]]) => <Tile key={id} label={L.recTiles[id]} value={v ?? '–'} sub={sub} />)}
    </div>}
    {card('readiness', L.readyChart, L.readyNote, <>
      <RangeSwitch id="readiness" value={rr} />
      <ExtChart h={180} fmt={int} series={[series('readiness', dR, 'date', 'readiness', C.s1)]} />
    </>)}
    {card('hrv', L.hrvChart, L.hrvNote, <>
      <RangeSwitch id="hrv" value={rh} />
      <ExtChart h={200} unit="ms" fmt={int} bands={[hrvBand]}
        series={[series('night', dH, 'date', 'hrv', C.neutral, 'dots'), series('hrv7', dH, 'date', 'hrv_7d', C.s1)]} />
    </>)}
    {card('rhr', L.rhrChart, L.rhrNote, <>
      <RangeSwitch id="rhr" value={rt} />
      <ExtChart h={180} unit="ud./min" fmt={int} series={[series('rhr', dT, 'date', 'rhr', C.s1), series('rhrNorm', dT, 'date', 'rhr_norm', C.s2)]} />
    </>)}
    {tiles.perf !== false && <Perf rows={perf} />}
  </>
}

// Readiness a wynik (Etap 3): the session index by readiness and sleep band, and its rank correlation
// with each watch metric, all from ptv4's readiness_perf. Below 20 sessions only "zbieram dane".
function Perf({ rows }) {
  const sum = rows.find(r => r.kind === 'summary')
  const buckets = rows.filter(r => r.kind === 'bucket'), corr = rows.filter(r => r.kind === 'corr')
  const num = (v, d = 1) => v == null ? '–' : v.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d })
  const width = v => Math.max(4, Math.min(100, (v - 80) / 25 * 100)) // index 80–105 across the bar
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{L.perfTitle}</h2><span className="small muted">{L.byPtv4}</span></div>
    <div className="small muted" style={{ marginTop: 4 }}>{L.perfNote}</div>
    <div className="small" style={{ marginTop: 8 }}>{sum?.txt ?? L.noData}</div>
    {sum?.enough && <>
      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
        {buckets.map(b => <div key={b.label} className="small">
          <div className="row between"><span>{b.label}</span><span><b>{num(b.index)}</b> <span className="muted">· {L.sessionsN(b.n)}</span></span></div>
          {b.index != null && <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', marginTop: 3 }}>
            <div style={{ width: width(b.index) + '%', height: '100%', borderRadius: 3, background: b.metric === 'sleep_h' ? C.s2 : C.s1 }} />
          </div>}
        </div>)}
      </div>
      <div className="small" style={{ marginTop: 12 }}><b>{L.perfCorr}</b></div>
      {corr.map(c => <div key={c.metric} className="row between small" style={{ marginTop: 4 }}>
        <span>{L.perfMetric[c.metric]}</span><span>{num(c.rho, 2)} <span className="muted">· n={c.n}</span></span>
      </div>)}
    </>}
    <div className="small muted" style={{ marginTop: 10 }}>{L.perfCaveat}</div>
  </div>
}

const Head = ({ title, note }) => <>
  <div className="row between"><h2 style={{ margin: 0 }}>{title}</h2><span className="small muted">{L.byPtv4}</span></div>
  {note && <div className="small muted" style={{ marginTop: 4 }}>{note}</div>}
</>
const num = (v, d = 1, fixed = false) => v == null ? '–' : v.toLocaleString('pl-PL', { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d })

// Siła: e1RM of one exercise over time (lifts, PRs as dots) and every active exercise with its
// 8-week change (lift_summary); a row of the table picks the chart's exercise.
function Strength({ lifts, summary, tiles }) {
  const names = summary.length ? summary.map(r => r.exercise) : [...new Set(lifts.map(r => r.exercise))]
  const [picked, setPicked] = useState(null)
  const pick = names.includes(picked) ? picked : names[0]
  const rr = useRange('lift')
  const rows = since(lifts.filter(r => r.exercise === pick), 'date', RANGES[rr])
  const chg = v => v == null ? undefined : v > 1 ? 'var(--green)' : v < -2 ? 'var(--red)' : undefined
  return <>
    {tiles.lift !== false && pick && <div className="card">
      <Head title={L.liftChart} note={L.liftNote} />
      <div className="sect-b measure-select" style={{ marginTop: 10 }}>
        <SelectRow title={L.exercise} sheetTitle={L.chooseExercise} value={pick} onChange={setPicked}
          options={names.map(n => ({ value: n, label: n }))} search={{ match: (o, q) => o.label.toLowerCase().includes(q.toLowerCase()) }} />
      </div>
      <RangeSwitch id="lift" value={rr} />
      <ExtChart h={200} unit="kg" series={[series('e1rm', rows, 'date', 'e1rm', C.s1), series('pr', rows.filter(r => r.pr), 'date', 'e1rm', C.s2, 'dots')]} />
    </div>}
    {tiles.table !== false && summary.length > 0 && <div className="card">
      <Head title={L.liftTable} note={L.liftTableNote} />
      <div className="ext-table" style={{ marginTop: 10 }}><table>
        <thead><tr><th>{L.colExercise}</th><th className="num">{L.colE1rm}</th><th className="num">{L.col8wk}</th><th className="num">{L.colPrs}</th></tr></thead>
        <tbody>{summary.map(r => <tr key={r.exercise} className={r.exercise === pick ? 'on' : ''} onClick={() => setPicked(r.exercise)}>
          <td>{r.exercise}</td><td className="num">{r.last_txt}</td><td className="num" style={{ color: chg(r.chg8) }}>{r.chg8_txt}</td><td className="num">{r.prs}</td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </>
}

// Objętość: fractional sets a week, muscle × the last 8 working blocks, in ptv4's bands.
const VOLUME_BANDS = [[4, C.neutral, 0.35], [10, 'var(--yellow)', 0.35], [20.0001, 'var(--green)', 0.4], [Infinity, C.s1, 0.45]]
function Volume({ rows }) {
  const blocks = [...new Set(rows.filter(r => !r.deload).map(r => r.block))].slice(-8)
  const shown = rows.filter(r => blocks.includes(r.block))
  const avg = m => shown.filter(r => r.muscle === m).reduce((a, r) => a + r.sets_wk, 0)
  const muscles = [...new Set(shown.map(r => r.muscle))].sort((a, b) => avg(b) - avg(a))
  const band = v => VOLUME_BANDS.find(([max]) => v < max)
  if (!blocks.length) return <div className="card muted small">{L.noData}</div>
  return <div className="card">
    <Head title={L.volumeTitle} note={L.volumeNote} />
    <div className="ext-table ext-heat" style={{ marginTop: 10 }}><table>
      <thead><tr><th />{blocks.map(b => <th key={b} className="num">{b}</th>)}</tr></thead>
      <tbody>{muscles.map(m => <tr key={m}><td>{m}</td>{blocks.map(b => {
        const r = shown.find(x => x.block === b && x.muscle === m), v = r ? r.sets_wk : 0, [, color, op] = band(v)
        return <td key={b} className="num" title={r ? `${m}, ${b}: ${num(v)} serii/tydz., ${num(r.freq_wk)} bodźca/tydz.` : undefined}>
          <i style={{ background: color, opacity: op }} /><span>{r ? num(v, v < 10 ? 1 : 0) : ''}</span>
        </td>
      })}</tr>)}</tbody>
    </table></div>
    <div className="ext-legend" style={{ marginTop: 10 }}>{L.volumeBands.map((n, i) => <span key={n}><i className="sq" style={{ background: VOLUME_BANDS[i][1], opacity: VOLUME_BANDS[i][2] + 0.3 }} />{n}</span>)}</div>
  </div>
}

// Dzień po dniu: sleep and steps by day, and the last 30 days of entries; a weigh-in ptv4 flags
// as off its 7-day mean in orange.
const DAILY_COLS = ['weight', 'waist', 'eat', 'burn', 'sleep', 'steps', 'protein', 'fat', 'carbs']
const DAILY_DEC = { weight: 1, waist: 1, sleep: 2 }
function Daily({ body, tiles }) {
  const rs = useRange('sleep'), rt = useRange('steps')
  const int = v => Math.round(v).toLocaleString('pl-PL')
  return <>
    {tiles.sleep !== false && <div className="card">
      <Head title={L.sleepChart} />
      <div style={{ marginTop: 10 }}><RangeSwitch id="sleep" value={rs} />
        <ExtChart h={180} unit="h" series={[series('sleep', since(body, 'date', RANGES[rs]), 'date', 'sleep', C.s1)]} /></div>
    </div>}
    {tiles.steps !== false && <div className="card">
      <Head title={L.stepsChart} />
      <div style={{ marginTop: 10 }}><RangeSwitch id="steps" value={rt} />
        <ExtChart h={180} fmt={int} series={[series('steps', since(body, 'date', RANGES[rt]), 'date', 'steps', C.s2)]} /></div>
    </div>}
    {tiles.table !== false && <div className="card">
      <Head title={L.dailyTable} note={L.dailyNote} />
      <div className="ext-table" style={{ marginTop: 10 }}><table>
        <thead><tr><th>{L.cols.date}</th>{DAILY_COLS.map(c => <th key={c} className="num">{L.cols[c]}</th>)}</tr></thead>
        <tbody>{body.slice(-30).reverse().map(r => <tr key={r.date}>
          <td>{new Date(r.date + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</td>
          {DAILY_COLS.map(c => <td key={c} className={'num' + (r[c] == null ? ' muted' : '')}
            style={c === 'weight' && r.weight_outlier ? { color: 'var(--orange)' } : undefined}
            title={c === 'weight' && r.weight_outlier ? L.prior7(num(r.weight_prior7, 2)) : undefined}>{num(r[c], DAILY_DEC[c] ?? 0, c === 'weight')}</td>)}
        </tr>)}</tbody>
      </table></div>
    </div>}
  </>
}

// /ptv4: Statystyki+, ptv4's numbers in openGym.
export default function Ptv4Stats() {
  const nav = useNavigate()
  const st = usePtv4(['kpi', 'energy', 'body', 'garmin_kpi', 'garmin_daily', 'readiness', 'lifts', 'lift_summary', 'volume'], { fresh: true })
  const ext = extOf(useStore(s => s.S))
  const layout = layoutOf(ext, 'stats')
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
      {sec.id === 'strength' && <Strength lifts={st.data.lifts} summary={st.data.lift_summary} tiles={sec.tiles} />}
      {sec.id === 'volume' && <Volume rows={st.data.volume} />}
      {sec.id === 'daily' && <Daily body={st.data.body} tiles={sec.tiles} />}
      {sec.id === 'recovery' && <Recovery k={st.data.garmin_kpi[0]} daily={st.data.garmin_daily} perf={st.data.readiness} tiles={sec.tiles} />}
    </div>)}
  </div>
}
