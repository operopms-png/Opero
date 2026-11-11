'use client'
// Platform Owner → Revenue and Customers: Novourq's own income, subscribers and cancellations across every
// client. Visible and callable by the platform owner's login only (see lib/platform-owner.ts).
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, Stat } from '../../../../components/crm/Page'
import { ownerFetch } from '../../../../lib/platform-fetch'

const KIND: Record<string, { label: string; color: string }> = {
  monthly: { label: 'Paying monthly', color: '#00C875' },
  yearly: { label: 'Paying annually', color: '#00B5A5' },
  trial: { label: 'Free trial', color: '#579BFC' },
  onetime: { label: 'One-time purchase', color: '#9D50DD' },
  complimentary: { label: 'Complimentary (no Stripe)', color: '#9699A6' },
  failing: { label: 'Payment failing', color: '#FDAB3D' },
  cancelled: { label: 'Cancelled', color: '#DF2F4A' },
}
const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function RevenuePage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')
  useEffect(() => { ownerFetch('/api/platform/revenue').then(r => r.ok ? setD(r.data) : setErr(r.data?.error || 'Could not load')) }, [])
  if (err) return <CrmPage><CrmHeader title="Revenue and Customers" /><Body><Empty>{err}</Empty></Body></CrmPage>
  if (!d) return <Loading />
  const s = d.summary
  const list = (d.customers as any[]).filter(c => filter === 'all' || c.kind === filter)
  return (
    <CrmPage>
      <CrmHeader theme="blue" title="Revenue and Customers" subtitle="Novourq's own income and customers across every client. Only your login can see this." />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 18 }}>
          <Stat theme="blue" label="Monthly income" value={gbp(s.mrr)} sub={`${s.monthly} monthly × ${gbp(s.prices.monthly)}, ${s.yearly ?? 0} annual`} highlight />
          <Stat theme="blue" label="Active subscribers" value={s.monthly + (s.yearly ?? 0) + s.trial + s.failing} sub={`${s.trial} on a free trial`} />
          <Stat theme="blue" label="New this month" value={s.newThisMonth} />
          <Stat theme="blue" label="Cancelled, last 30 days" value={s.cancelledLast30} sub={`${s.cancelled} in total`} />
          <Stat theme="blue" label="One-time purchases" value={gbp(s.oneTimeRevenue)} sub={`${s.onetime} × ${gbp(s.prices.onetime)}`} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[['all', 'All', d.customers.length], ...Object.entries(KIND).map(([k, v]) => [k, v.label, d.customers.filter((c: any) => c.kind === k).length])].map(([k, l, n]: any) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 12px', borderRadius: 16, border: '1px solid ' + (filter === k ? '#1B2F6E' : C.border), background: filter === k ? '#1B2F6E' : '#fff', color: filter === k ? '#fff' : C.ink, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l} <span style={{ opacity: .7 }}>{n}</span></button>
          ))}
        </div>
        {list.length === 0 ? <Empty>No customers in this view.</Empty> : (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ background: '#F5F6F8', textAlign: 'left', color: C.muted, fontSize: 12 }}>
                {['Customer', 'Status', 'Plan', 'Billing', 'Customer since', 'Last change', 'Trial ends'].map(h => <th key={h} style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>{list.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid ' + C.row }}>
                  <td style={{ padding: '10px 14px' }}><div style={{ fontWeight: 600, color: C.ink }}>{c.name}</div><div style={{ fontSize: 12, color: C.faint }}>{c.email}</div></td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><span style={{ background: KIND[c.kind].color, color: '#fff', borderRadius: 4, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>{KIND[c.kind].label}</span></td>
                  <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>{c.plan}</td>
                  <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>{c.period || '—'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{day(c.since)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{day(c.changed)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{day(c.trial_end)}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.faint, marginTop: 12, lineHeight: 1.6 }}>
          Figures come from your subscriptions and the plan prices ({gbp(s.prices.monthly)} a month, {gbp(s.prices.onetime)} one-time). Accounts with no Stripe customer are shown as complimentary and are not counted as income. Stripe is the record for exact payments.
        </div>
      </Body>
    </CrmPage>
  )
}
