'use client'
// Shared pieces of the KPI Tracker: the status colours, the tiny trend line and one KPI tile.
import React from 'react'
import { fmt, type Kpi } from '@/lib/kpi'

export const KPI_COL = { good: '#138a62', watch: '#C98A12', bad: '#C0392B', none: '#98A2B3' } as const
export const KPI_WORD = { good: 'On target', watch: 'Close', bad: 'Behind', none: 'No target' } as const

export function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const v = values.map(x => (x == null ? null : Number(x)))
  const nums = v.filter((x): x is number => x != null)
  if (nums.length < 2) return <div style={{ height: 26 }} />
  const lo = Math.min(...nums), hi = Math.max(...nums), W = 100, H = 26
  const pts = v.map((x, i) => x == null ? null : [(i / (v.length - 1)) * W, H - 3 - ((x - lo) / (hi - lo || 1)) * (H - 6)]).filter(Boolean) as number[][]
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden><polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

export function KpiTile({ k, onClick, compact }: { k: Kpi; onClick?: () => void; compact?: boolean }) {
  const col = KPI_COL[k.status]
  const diff = k.value != null && k.prev != null ? k.value - k.prev : null
  const up = diff != null && diff !== 0 && (k.direction === 'higher' ? diff > 0 : diff < 0)
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} style={{ background: '#fff', border: '1px solid #E4E7EC', borderTop: `3px solid ${col}`, borderRadius: 12, padding: compact ? '10px 12px' : '14px 16px', cursor: onClick ? 'pointer' : 'default', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475467', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: col, whiteSpace: 'nowrap' }}>{KPI_WORD[k.status]}</span>
      </div>
      <div style={{ fontSize: compact ? 22 : 28, fontWeight: 700, color: '#16233F', margin: '4px 0 2px' }}>{fmt(k.value, k.unit)}</div>
      <div style={{ fontSize: 11.5, color: '#667085', minHeight: 16 }}>
        {k.target != null ? <>Target {fmt(k.target, k.unit)}</> : 'No target set'}
        {diff != null && diff !== 0 && <span style={{ color: up ? KPI_COL.good : KPI_COL.bad, fontWeight: 600 }}> · {diff > 0 ? '▲' : '▼'} {fmt(Math.abs(diff), k.unit)}</span>}
      </div>
      <Spark values={k.history.map(h => h.value)} color={col} />
      {!compact && <div style={{ fontSize: 10.5, color: '#98A2B3', marginTop: 2 }}>{k.auto ? 'Worked out from the portal' : 'Typed in by your team'}</div>}
    </div>
  )
}
