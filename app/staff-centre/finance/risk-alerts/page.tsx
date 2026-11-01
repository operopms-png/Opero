'use client'
// Staff Centre → Finance → Risk alerts: properties we sublet under a head lease where
// tenant rent is late while we still owe the landlord the head rent.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi, money } from '../../../../lib/staff-api'

const fmt = (iso?: string | null) => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function RiskAlerts() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi('/api/finance/risk-alerts').then(setD).catch(e => setErr(e.message)) }, [])
  const alerts: any[] = d?.alerts || []
  const high = alerts.filter(a => a.risk === 'High')
  const link: React.CSSProperties = { padding: '7px 14px', borderRadius: 8, border: '1px solid #D0D4E4', background: '#fff', color: '#191815', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'inherit' }
  return (
    <CrmPage>
      <CrmHeader title="Property risk alerts" subtitle="Properties where tenant rent is late while head rent is still owed to the landlord." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Properties at risk" value={<span style={{ color: alerts.length ? C.red : C.ink }}>{alerts.length}</span>} sub="Late rent on a head lease" highlight />
            <Stat label="High risk" value={high.length} sub="7+ days late, or head rent not covered" />
            <Stat label="Medium risk" value={alerts.length - high.length} sub="Under 7 days late" />
          </div>
          {alerts.length === 0 ? <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 18 }}><Empty>No head-lease properties have late rent.</Empty></div> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {alerts.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{a.property}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{a.landlord ? `Landlord: ${a.landlord}` : 'Head lease'}{a.tenants.length ? ` · ${a.tenants.join(', ')}` : ''}</div>
                    </div>
                    <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: a.risk === 'High' ? '#FDECEA' : '#FFF4DB', color: a.risk === 'High' ? '#B42318' : '#8A5A00' }}>{a.risk} risk</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
                    {[['Tenant rent due this month', money(a.rent_due_this_month, a.currency)], ['Received this month', money(a.rent_received, a.currency)], ['Overdue', money(a.rent_overdue, a.currency)], ['Days overdue', String(a.days_overdue)], ['Head rent we owe', money(a.head_rent, a.head_currency)], ['Exposure to landlord', a.exposure == null ? '—' : money(a.exposure, a.head_currency)]].map(([l, v]) => (
                      <div key={l} style={{ background: '#F7F8FA', borderRadius: 8, padding: '9px 11px' }}><div style={{ fontSize: 11.5, color: C.muted }}>{l}</div><div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Recommended action</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>{a.action}</div>
                  {a.head_lease_expiry && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Head lease expires {fmt(a.head_lease_expiry)}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href="/staff-centre/finance/reminders" style={link}>Open reminder drafts</Link>
                    <Link href="/staff-centre/finance/arrears" style={link}>View arrears</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}
      </Body>
    </CrmPage>
  )
}
