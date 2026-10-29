import { useLayoutEffect, useRef, useState } from 'react'
import { MONTHS } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'

// Statystyki+'s chart. upstream's LineChart draws each next series thinner on top and colours the
// first with the accent, so three lines read as one smear; here every line is the same 2px, each
// series has its own colour (--ext-s1…, ext.css), a range is a band with dashed edges, weigh-ins
// are dots. A crosshair and a tooltip show every series at the hovered date; a legend names them.
//   series: [{ key, name, color, kind?: 'line' | 'dots', points: [{ t, y }] }]
//   bands:  [{ key, name, color, points: [{ t, lo, hi }] }]
const PAD = { l: 44, r: 10, t: 10, b: 22 }
const DAY = 86400000

function niceTicks(min, max, n = 4) {
  const raw = (max - min) / n || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw)
  const out = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

function monthTicks(t0, t1, max = 6) {
  const out = []
  const d = new Date(t0); d.setDate(1); d.setHours(12, 0, 0, 0)
  if (d.getTime() < t0) d.setMonth(d.getMonth() + 1)
  for (; d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) out.push({ t: d.getTime(), m: d.getMonth(), y: d.getFullYear() })
  const every = Math.ceil(out.length / max) || 1
  return out.filter((_, i) => i % every === 0)
}

export default function ExtChart({ series = [], bands = [], h = 180, unit = '', fmt = v => v.toLocaleString('pl-PL', { maximumFractionDigits: 1 }) }) {
  const wrap = useRef(null)
  // No width until measured: an svg drawn wider than the phone for one frame made mobile browsers
  // zoom the whole page out, and they do not zoom back in.
  const [w, setW] = useState(null)
  const [hover, setHover] = useState(null)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = width => setW(Math.max(200, Math.floor(width)))
    fit(el.clientWidth)
    const ro = new ResizeObserver(([e]) => fit(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (w == null) return <div ref={wrap} style={{ height: h + 30, minWidth: 0 }} />

  const ts = [...series.flatMap(s => s.points.map(p => p.t)), ...bands.flatMap(b => b.points.map(p => p.t))]
  const ys = [...series.flatMap(s => s.points.map(p => p.y)), ...bands.flatMap(b => b.points.flatMap(p => [p.lo, p.hi]))].filter(Number.isFinite)
  if (!ts.length || !ys.length) return <div ref={wrap} className="small muted" style={{ minWidth: 0, padding: '24px 0', textAlign: 'center' }}>{t('No data yet')}</div>
  const t0 = Math.min(...ts), t1 = Math.max(...ts)
  const lo = Math.min(...ys), hi = Math.max(...ys), padY = (hi - lo) * 0.08 || 1
  const ticks = niceTicks(lo - padY, hi + padY)
  const y0 = Math.min(lo - padY, ticks[0]), y1 = Math.max(hi + padY, ticks.at(-1))
  const X = v => PAD.l + (t1 === t0 ? 0.5 : (v - t0) / (t1 - t0)) * (w - PAD.l - PAD.r)
  const Y = v => PAD.t + (1 - (v - y0) / (y1 - y0)) * (h - PAD.t - PAD.b)
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('')

  // the hovered date: the nearest point of any series; each series shows its point within 4 days
  const times = [...new Set(series.flatMap(s => s.points.map(p => p.t)))].sort((a, b) => a - b)
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width * w
    const at = times.reduce((best, v) => Math.abs(X(v) - x) < Math.abs(X(best) - x) ? v : best, times[0])
    setHover(at)
  }
  const near = (pts, at) => pts.reduce((b, p) => Math.abs(p.t - at) <= 4 * DAY && (!b || Math.abs(p.t - at) < Math.abs(b.t - at)) ? p : b, null)

  return <div ref={wrap} style={{ position: 'relative', minWidth: 0 }}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: '100%', touchAction: 'pan-y' }}
      onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img">
      {ticks.map(v => <g key={v}>
        <line x1={PAD.l} x2={w - PAD.r} y1={Y(v)} y2={Y(v)} stroke="var(--sep)" strokeWidth="1" />
        <text x={PAD.l - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--label-3)">{fmt(v)}</text>
      </g>)}
      {monthTicks(t0, t1).map(m => <text key={m.t} x={X(m.t)} y={h - 6} textAnchor="middle" fontSize="11" fill="var(--label-3)">
        {t(MONTHS[m.m])}{m.m === 0 ? ' ' + m.y : ''}
      </text>)}
      {bands.map(b => {
        const pts = b.points.filter(p => Number.isFinite(p.lo) && Number.isFinite(p.hi))
        if (!pts.length) return null
        const top = pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ',' + Y(p.hi).toFixed(1)).join('')
        const bottom = [...pts].reverse().map(p => 'L' + X(p.t).toFixed(1) + ',' + Y(p.lo).toFixed(1)).join('')
        return <g key={b.key}>
          <path d={top + bottom + 'Z'} fill={b.color} opacity="0.16" />
          <path d={path(pts.map(p => ({ t: p.t, y: p.hi })))} fill="none" stroke={b.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
          <path d={path(pts.map(p => ({ t: p.t, y: p.lo })))} fill="none" stroke={b.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
        </g>
      })}
      {series.map(s => s.kind === 'dots'
        ? <g key={s.key}>{s.points.map(p => <circle key={p.t} cx={X(p.t)} cy={Y(p.y)} r="2" fill={s.color} opacity="0.55" />)}</g>
        : <path key={s.key} d={path(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
      {hover != null && <>
        <line x1={X(hover)} x2={X(hover)} y1={PAD.t} y2={h - PAD.b} stroke="var(--label-3)" strokeWidth="1" />
        {series.map(s => { const p = near(s.points, hover); return p && <circle key={s.key} cx={X(p.t)} cy={Y(p.y)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> })}
      </>}
    </svg>
    {hover != null && <div className="ext-tip" style={{ left: Math.min(Math.max(X(hover), 70), w - 70) }}>
      <b>{new Date(hover).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
      {series.map(s => { const p = near(s.points, hover); return p && <div key={s.key}><i style={{ background: s.color }} />{s.name}: {fmt(p.y)}{unit && ' ' + unit}</div> })}
      {bands.map(b => { const p = near(b.points, hover); return p && <div key={b.key}><i style={{ background: b.color, opacity: 0.5 }} />{b.name}: {fmt(p.lo)}–{fmt(p.hi)}{unit && ' ' + unit}</div> })}
    </div>}
    <div className="ext-legend">
      {series.map(s => <span key={s.key}><i className={s.kind === 'dots' ? 'dot' : ''} style={{ background: s.color }} />{s.name}</span>)}
      {bands.map(b => <span key={b.key}><i className="band" style={{ borderColor: b.color, background: b.color }} />{b.name}</span>)}
    </div>
  </div>
}
