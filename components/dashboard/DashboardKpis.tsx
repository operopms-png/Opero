'use client'
// Dashboard box: KPI Tracker. This month's numbers against target. View only: targets and entries are managed in KPI Tracker.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '@/lib/staff-api'
import type { Kpi } from '@/lib/kpi'
import { KpiTile, KPI_COL } from '../kpis/KpiBits'

export default function DashboardKpis() {
  const [ks, setKs] = useState<Kpi[] | null>(null)
  useEffect(() => { staffApi('/api/kpis').then((r: any) => setKs(r.kpis || [])).catch(() => setKs([])) }, [])
  if (ks && ks.length === 0) return null
  const n = (s: string) => (ks || []).filter(k => k.status === s).length
  return (
    <div style={{ margin: '0 30px 16px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: '#16233F' }}>KPI Tracker</div><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>This month against target.</div></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, fontWeight: 600 }}>
          {ks && <><span style={{ color: KPI_COL.good }}>{n('good')} on target</span><span style={{ color: KPI_COL.watch }}>{n('watch')} close</span><span style={{ color: KPI_COL.bad }}>{n('bad')} behind</span></>}
          <Link href="/staff-centre/kpis" style={{ color: '#2F6DB5', textDecoration: 'none' }}>Open →</Link>
        </div>
      </div>
      {ks === null ? <div style={{ padding: 14, color: '#98A2B3', fontSize: 13 }}>Loading…</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10, marginTop: 12 }}>{ks.map(k => <KpiTile key={k.id} k={k} compact />)}</div>}
    </div>
  )
}
