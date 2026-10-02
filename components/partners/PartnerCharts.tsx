'use client'
import { useEffect, useRef, useState } from 'react'

// Measures a chart's container so the SVG is drawn at its real pixel width (text stays crisp and the same size).
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => { const cw = Math.round(e.contentRect.width); if (cw > 0) setW(cw) })
    ro.observe(el); return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

// Charts for Staff Centre → Partners (Dashboard + Agent Programme).
// Plain SVG, no chart library. Colours: short-term (guests) gold, long-term
// (tenants) blue — a pair checked for colour-blind separation.

export const ST_COL = '#B08A2E'
export const LT_COL = '#2F6DB5'
const INK = '#191815', MUTE = '#8a857a', GRID = '#f0ede6', AXIS = '#d9d4c8', LINE = '#ebe7de'

export type Period = '30d' | 'quarter' | '12m'
export const PERIOD_LABEL: Record<Period, string> = { '30d': '30 days', quarter: 'Quarter', '12m': '12 months' }
export type Bucket = { start: number; end: number; label: string; long: string }

// Time buckets for a period: daily for 30 days, weekly for a quarter, monthly for 12 months.
export function buckets(p: Period, offset = 0): Bucket[] {
  const out: Bucket[] = []
  const now = new Date()
  if (p === '12m') {
    for (let i = 11 + offset * 12; i >= offset * 12; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      out.push({ start: s.getTime(), end: e.getTime(), label: s.toLocaleDateString('en-GB', { month: 'short' }), long: s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) })
    }
  } else {
    const n = p === '30d' ? 30 : 13, step = p === '30d' ? 1 : 7
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
    for (let i = n - 1 + offset * n; i >= offset * n; i--) {
      const e = today - i * step * 864e5, s = e - step * 864e5
      const d = new Date(s)
      out.push({ start: s, end: e, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), long: step === 1 ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` })
    }
  }
  return out
}

export function bucketSum<T>(bs: Bucket[], items: T[], when: (x: T) => string | null | undefined, val: (x: T) => number = () => 1) {
  return bs.map(b => items.reduce((s, x) => { const w = when(x); if (!w) return s; const t = new Date(w).getTime(); return t >= b.start && t < b.end ? s + val(x) : s }, 0))
}

function niceMax(v: number) {
  if (v <= 4) return 4
  const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p
}

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8 }

export function Panel({ title, meta, right, children, pad = true }: { title: string; meta?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  return (
    <div style={{ ...card, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 18px', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{title}</div>
        {right ?? (meta != null && <div style={{ fontSize: 12, color: MUTE }}>{meta}</div>)}
      </div>
      <div style={{ padding: pad ? '16px 18px' : 0, flex: 1 }}>{children}</div>
    </div>
  )
}

export function Spark({ data, w = 84, h = 34, color = ST_COL }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (data.length < 2) return null
  const mx = Math.max(...data), mn = Math.min(...data)
  const pts = data.map((v, i) => [i * (w / (data.length - 1)), h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 8)] as const)
  const flat = mx === mn
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${(flat ? h - 4 : p[1]).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }} aria-hidden>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={flat ? AXIS : color} strokeWidth={2} strokeLinejoin="round" />
      {!flat && <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />}
    </svg>
  )
}

export function Kpi({ label, value, delta, deltaText, data, highlight }: { label: string; value: string; delta?: number; deltaText?: string; data?: number[]; highlight?: boolean }) {
  const up = (delta ?? 0) > 0, down = (delta ?? 0) < 0
  return (
    <div style={{ ...card, padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, minWidth: 0, ...(highlight ? { background: 'linear-gradient(135deg,#FBF4E6,#F6EBD2)', borderColor: '#EADBB8' } : {}) }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: highlight ? '#8A6B2E' : MUTE, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 5, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {deltaText && (
          <div style={{ fontSize: 12, marginTop: 2, color: '#55524b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(up || down) && <span style={{ color: up ? '#1F7A4D' : '#B3261E', fontWeight: 600 }}>{up ? '▲' : '▼'} </span>}{deltaText}
          </div>
        )}
      </div>
      {data && <Spark data={data} />}
    </div>
  )
}

function Tip({ x, W, children }: { x: number; W: number; children: React.ReactNode }) {
  const pct = (x / W) * 100
  return (
    <div style={{ position: 'absolute', top: 0, left: `${pct}%`, transform: `translateX(${pct > 70 ? '-100%' : pct < 15 ? '0' : '-50%'})`, background: INK, color: '#fff', fontSize: 12, padding: '8px 10px', borderRadius: 6, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,.18)', zIndex: 2 }}>
      {children}
    </div>
  )
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#55524b', flexWrap: 'wrap' }}>
      {items.map(([c, l]) => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}</span>)}
    </div>
  )
}

// Stacked bars (short-term at the base, long-term on top) with a 2px gap and a hover tooltip.
export function StackedBars({ bs, a, b, aName, bName, empty }: { bs: Bucket[]; a: number[]; b: number[]; aName: string; bName: string; empty: string }) {
  const [hov, setHov] = useState<number | null>(null)
  const [ref, W] = useWidth(720)
  const H = 250, pl = 34, pb = 26, pt = 18
  const tot = a.map((v, i) => v + b[i])
  const mx = Math.ceil(niceMax(Math.max(...tot, 0)) / 4) * 4
  const cw = (W - pl - 8) / bs.length, bw = Math.min(40, cw * 0.56)
  const sc = (H - pt - pb) / mx
  const every = Math.max(1, Math.ceil(bs.length / Math.max(2, Math.floor((W - pl) / 52))))
  const allZero = tot.every(v => v === 0)
  const last = tot.length - 1
  return (
    <div ref={ref} style={{ position: 'relative' }} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {[0, 1, 2, 3, 4].map(g => { const y = pt + (H - pt - pb) * (1 - g / 4); return <g key={g}><line x1={pl} x2={W - 4} y1={y} y2={y} stroke={GRID} /><text x={pl - 8} y={y + 4} textAnchor="end" fontSize={11} fill={MUTE}>{(mx / 4) * g}</text></g> })}
        {bs.map((bk, i) => {
          const x = pl + i * cw + (cw - bw) / 2, h1 = a[i] * sc, h2 = b[i] * sc, y1 = H - pb - h1, y2 = y1 - (h1 && h2 ? 2 : 0) - h2, r = Math.min(4, bw / 2)
          const top = h2 > 0 ? 'b' : 'a'
          return (
            <g key={i} opacity={hov == null || hov === i ? 1 : 0.45}>
              {h1 > 0 && (top === 'a'
                ? <path d={`M${x} ${H - pb} V${y1 + r} Q${x} ${y1} ${x + r} ${y1} H${x + bw - r} Q${x + bw} ${y1} ${x + bw} ${y1 + r} V${H - pb}Z`} fill={ST_COL} />
                : <rect x={x} y={y1} width={bw} height={h1} fill={ST_COL} />)}
              {h2 > 0 && <path d={`M${x} ${y2 + h2} V${y2 + Math.min(r, h2)} Q${x} ${y2} ${x + r} ${y2} H${x + bw - r} Q${x + bw} ${y2} ${x + bw} ${y2 + Math.min(r, h2)} V${y2 + h2}Z`} fill={LT_COL} />}
              {i % every === (bs.length - 1) % every && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={MUTE}>{bk.label}</text>}
              {i === last && tot[i] > 0 && <text x={x + bw / 2} y={y2 - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill={INK}>{tot[i]}</text>}
              <rect x={pl + i * cw} y={pt} width={cw} height={H - pt - pb} fill="transparent" onMouseEnter={() => setHov(i)} />
            </g>
          )
        })}
        <line x1={pl} x2={W - 4} y1={H - pb} y2={H - pb} stroke={AXIS} />
        {allZero && <text x={(W + pl) / 2} y={H / 2} textAnchor="middle" fontSize={13} fill={MUTE}>{empty}</text>}
      </svg>
      {hov != null && !allZero && (
        <Tip x={pl + hov * cw + cw / 2} W={W}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{bs[hov].long}</div>
          <div><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: ST_COL, marginRight: 6 }} />{aName}: <b>{a[hov]}</b></div>
          <div><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: LT_COL, marginRight: 6 }} />{bName}: <b>{b[hov]}</b></div>
        </Tip>
      )}
    </div>
  )
}

// Single-series area line (e.g. commission paid) with crosshair tooltip.
export function TrendLine({ bs, values, fmt, empty }: { bs: Bucket[]; values: number[]; fmt: (n: number) => string; empty: string }) {
  const [hov, setHov] = useState<number | null>(null)
  const [ref, W] = useWidth(460)
  const H = 250, pl = 50, pb = 26, pt = 22
  const mx = values.every(v => v === 0) ? 400 : niceMax(Math.max(...values, 0))
  const cw = (W - pl - 14) / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [pl + i * cw, H - pb - (v / mx) * (H - pt - pb)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const every = Math.max(1, Math.ceil(bs.length / Math.max(2, Math.floor((W - pl) / 56))))
  const allZero = values.every(v => v === 0)
  const L = pts.length - 1
  return (
    <div ref={ref} style={{ position: 'relative' }} onMouseLeave={() => setHov(null)}
      onMouseMove={e => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHov(Math.max(0, Math.min(L, Math.round((x - pl) / cw)))) }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {[0, 1, 2, 3, 4].map(g => { const y = pt + (H - pt - pb) * (1 - g / 4); return <g key={g}><line x1={pl} x2={W - 4} y1={y} y2={y} stroke={GRID} /><text x={pl - 8} y={y + 4} textAnchor="end" fontSize={11} fill={MUTE}>{fmt((mx / 4) * g)}</text></g> })}
        {bs.map((bk, i) => i % every === L % every && <text key={i} x={pl + i * cw} y={H - 8} textAnchor="middle" fontSize={11} fill={MUTE}>{bk.label}</text>)}
        {!allZero && <path d={`${d} L${pts[L][0]} ${H - pb} L${pl} ${H - pb}Z`} fill={ST_COL} opacity={0.1} />}
        <path d={d} fill="none" stroke={allZero ? AXIS : ST_COL} strokeWidth={2} strokeLinejoin="round" />
        <line x1={pl} x2={W - 4} y1={H - pb} y2={H - pb} stroke={AXIS} />
        {hov != null && !allZero && <><line x1={pts[hov][0]} x2={pts[hov][0]} y1={pt} y2={H - pb} stroke={AXIS} strokeDasharray="3 3" /><circle cx={pts[hov][0]} cy={pts[hov][1]} r={4.5} fill={ST_COL} stroke="#fff" strokeWidth={2} /></>}
        {hov == null && !allZero && values[L] > 0 && <><circle cx={pts[L][0]} cy={pts[L][1]} r={4.5} fill={ST_COL} stroke="#fff" strokeWidth={2} /><text x={pts[L][0] - 8} y={pts[L][1] - 10} textAnchor="end" fontSize={12} fontWeight={700} fill={INK}>{fmt(values[L])}</text></>}
        {allZero && <text x={(W + pl) / 2} y={H / 2} textAnchor="middle" fontSize={13} fill={MUTE}>{empty}</text>}
      </svg>
      {hov != null && !allZero && <Tip x={pts[hov][0]} W={W}><div style={{ fontWeight: 700, marginBottom: 2 }}>{bs[hov].long}</div><div>Paid: <b>{fmt(values[hov])}</b></div></Tip>}
    </div>
  )
}

// Funnel as horizontal bars, each relative to the first stage.
export function Funnel({ stages }: { stages: [string, number][] }) {
  const top = stages[0]?.[1] || 0
  return (
    <div>
      {stages.map(([l, v], i) => {
        const pct = top ? Math.round((v / top) * 100) : 0
        return (
          <div key={l} style={{ marginBottom: i === stages.length - 1 ? 0 : 13 }} title={`${l}: ${v}${top ? ` (${pct}% of referrals)` : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ fontWeight: 500, color: INK }}>{l}</span>
              <span><b style={{ fontVariantNumeric: 'tabular-nums', color: INK }}>{v}</b><span style={{ color: MUTE, marginLeft: 8, display: 'inline-block', minWidth: 34, textAlign: 'right' }}>{top ? `${pct}%` : '—'}</span></span>
            </div>
            <div style={{ height: 10, background: '#f0ede6', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${top ? (v / top) * 100 : 0}%`, background: ST_COL, opacity: 1 - i * 0.13, borderRadius: 5 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
      {options.map(([k, l], i) => (
        <button key={k} onClick={() => onChange(k)} style={{ padding: '7px 12px', fontSize: 12.5, border: 'none', borderLeft: i ? `1px solid ${LINE}` : 'none', background: value === k ? INK : '#fff', color: value === k ? '#fff' : '#55524b', fontWeight: value === k ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
      ))}
    </div>
  )
}

export function Badge({ tone, children }: { tone: 'gold' | 'green' | 'amber' | 'blue' | 'grey' | 'red'; children: React.ReactNode }) {
  const t = { gold: ['#faf3e2', '#8E6B1F'], green: ['#e7f4ec', '#1F7A4D'], amber: ['#fdf1dc', '#9A5B00'], blue: ['#e6eef8', '#1f4f8a'], grey: ['#f0efec', '#55524b'], red: ['#fdecea', '#B3261E'] }[tone]
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: t[0], color: t[1], whiteSpace: 'nowrap' }}>{children}</span>
}

export function Avatar({ name }: { name: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#efe6d2', color: '#6b5420', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>{ini || '—'}</span>
}

// Tier from referrals that actually stayed / moved in.
export function agentTier(completed: number): { label: string; tone: 'gold' | 'grey' | 'blue' | 'green' } {
  if (completed >= 10) return { label: 'Gold', tone: 'gold' }
  if (completed >= 5) return { label: 'Silver', tone: 'grey' }
  if (completed >= 1) return { label: 'Bronze', tone: 'blue' }
  return { label: 'New', tone: 'green' }
}
