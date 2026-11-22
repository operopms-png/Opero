'use client'
// Staff Centre → Owners & Tenants → Everyone. Owners and tenants from Property Management and Estate Agency
// in one list, one row per person, with which modules they are in and anything that differs between the two.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const MOD: Record<string, { label: string; color: string }> = { pm: { label: 'Property Management', color: '#2F6DB5' }, ea: { label: 'Estate Agency', color: '#138a62' } }

export default function Everyone() {
  const [d, setD] = useState<{ owners: any[]; tenants: any[] } | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'owners' | 'tenants'>('owners')
  const [q, setQ] = useState('')
  useEffect(() => { staffApi<any>('/api/people-overview').then(setD).catch(e => setErr(e.message)) }, [])
  const rows = (d?.[tab] ?? []).filter(p => !q.trim() || [p.name, p.email, p.phone].some((v: string) => (v || '').toLowerCase().includes(q.trim().toLowerCase())))
  const both = (d?.[tab] ?? []).filter(p => p.modules.length > 1).length
  const differs = (d?.[tab] ?? []).filter(p => p.differs.length).length
  const open = tab === 'owners' ? { pm: '/pm?tab=Landlords', ea: '/estate?section=Landlords' } : { pm: '/pm?tab=Tenants', ea: '/estate?section=Tenants' }
  return (
    <CrmPage>
      <CrmHeader title="Everyone" subtitle="Owners and tenants from Property Management and Estate Agency in one list, one row per person. People are matched on email. A flag shows when the same person has different details in each module, so you can fix it." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={btn(tab === 'owners' ? 'gold' : 'ghost', true)} onClick={() => setTab('owners')}>Owners ({d.owners.length})</button>
              <button style={btn(tab === 'tenants' ? 'gold' : 'ghost', true)} onClick={() => setTab('tenants')}>Tenants ({d.tenants.length})</button>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone" style={{ ...input, width: 260 }} />
              <span style={{ fontSize: 13, color: C.muted }}>{both} in both modules{differs ? ` · ${differs} with different details` : ''}</span>
            </div>
            {rows.length === 0 ? <Empty>Nobody found.</Empty> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {rows.map(p => (
                  <div key={p.key} style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: C.ink }}>{p.name || 'No name'}{p.status ? <span style={{ fontWeight: 400, color: C.faint }}> · {p.status}</span> : null}</div>
                      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{[p.email, p.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
                      {p.differs.length > 0 && <div style={{ fontSize: 12, color: '#B25E09', marginTop: 4 }}>The {p.differs.join(' and ')} differ{p.differs.length === 1 ? 's' : ''} between Property Management and Estate Agency. Update both so they match.</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.modules.map((m: string) => <Link key={m} href={(open as any)[m]} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 12, background: MOD[m].color + '1A', color: MOD[m].color, textDecoration: 'none' }}>{MOD[m].label}</Link>)}
                    </div>
                  </div>))}
              </div>
            )}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
