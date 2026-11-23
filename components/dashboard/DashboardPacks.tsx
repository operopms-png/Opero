'use client'
// Dashboard box: Investment Packs. A view of every saved pack with how many are at each stage and the latest ones.
// View only: names, stages and edits are managed in Staff Centre → Marketing → Pack Builder.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '@/lib/staff-api'
import { useRole, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { STAGES, STAGE_COLOR, stageLabel } from '@/lib/pack-calc'

const when = (d: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

export default function DashboardPacks() {
  const { role, modules, loading } = useRole()
  const allowed = !loading && getScTabs(role, modules ?? ROLE_MODULES[role] ?? []).includes('marketing')
  const [packs, setPacks] = useState<any[] | null>(null)
  useEffect(() => { if (allowed) staffApi('/api/packs').then((r: any) => setPacks(r.packs || [])).catch(() => setPacks([])) }, [allowed])
  if (!allowed) return null
  const count = (k: string) => (packs || []).filter(p => p.stage === k).length
  return (
    <div style={{ margin: 0, minWidth: 0, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: '#16233F' }}>Investment Packs</div><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Where each investor pack has got to.</div></div>
        <Link href="/staff-centre/packs" style={{ fontSize: 12.5, fontWeight: 600, color: '#2F6DB5', textDecoration: 'none', whiteSpace: 'nowrap' }}>View all →</Link>
      </div>
      {packs === null ? <div style={{ padding: 14, color: '#98A2B3', fontSize: 13 }}>Loading…</div>
        : packs.length === 0 ? <div style={{ padding: 14, color: '#667085', fontSize: 13 }}>No packs yet. Create one in Pack Builder.</div>
        : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '12px 0' }}>
            {STAGES.filter(s => s.k !== 'closed').map(s => <div key={s.k} style={{ background: '#F6F8FB', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 18, fontWeight: 700, color: '#16233F' }}>{count(s.k)}</div><div style={{ fontSize: 11, color: '#667085' }}>{s.l}</div></div>)}
          </div>
          {packs.slice(0, 5).map(p => {
            const c = STAGE_COLOR[p.stage] || STAGE_COLOR.draft
            return <div key={p.id} style={{ borderTop: '1px solid #F2F4F7', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#16233F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>{p.prepared_for ? `For ${p.prepared_for} · ` : ''}{p.last_opened_at ? `Opened ${when(p.last_opened_at)}` : p.stage === 'draft' ? 'Not sent yet' : 'Not opened yet'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.fg }}>{stageLabel(p.stage)}</span>
                <Link href={`/staff-centre/packs?id=${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: '#16233F', border: '1px solid #D0D5DD', borderRadius: 7, padding: '4px 10px', textDecoration: 'none' }}>Open</Link>
              </div>
            </div>
          })}
        </>}
    </div>
  )
}
