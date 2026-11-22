'use client'
// Staff Centre → AI Command Centre → Morning brief. One page: what needs your yes (approve here), what went out
// in the last 24 hours, what came in, and what else needs attention. Approving uses the same route as AI Approvals.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const AGENT: Record<string, string> = { marketing_posts: 'Marketing', sales_followup: 'Sales', guest: 'Guest', cleaning: 'Cleaning', maintenance: 'Maintenance', revenue: 'Pricing', owner: 'Owner reports', weekly_report: 'Weekly report' }
// These change records or prices, so they are checked by eye in AI Approvals, never approved from a summary.
const CHECK = ['rate_change', 'lease_update', 'mark_rent_paid', 'import_records', 'partner_investment']
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const box: React.CSSProperties = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }
const h: React.CSSProperties = { margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: C.ink }

export default function MorningBrief() {
  const [d, setD] = useState<any>(null)
  const [brief, setBrief] = useState<any[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const load = () => {
    staffApi<any>('/api/ai-morning').then(x => { setD(x); setErr('') }).catch(e => setErr(e.message))
    staffApi<{ items: any[] }>('/api/ai-briefing').then(x => setBrief(x.items ?? [])).catch(() => {})
  }
  useEffect(() => { load() }, [])
  const decide = async (r: any, action: 'approve' | 'reject') => {
    setBusy(r.id)
    try { await staffApi('/api/ai-approvals', { id: r.id, action, body: action === 'approve' ? r.draft_body : undefined }) } catch (e: any) { setErr(e.message) }
    await load(); setBusy(null)
  }
  const cameIn = d ? [...d.came_in.deals.map((x: any) => `Enquiry: ${x.name}`), ...d.came_in.leads.map((x: any) => `Lead: ${x.name}`), ...d.came_in.contacts.map((x: any) => `Contact: ${x.name}`)] : []
  const attention = brief.filter(i => i.key !== 'approvals')
  return (
    <CrmPage>
      <CrmHeader title="Morning brief" subtitle="What needs your yes, what went out in the last 24 hours and what came in, on one page." />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {!d ? <Loading /> : <>
          <div style={box}>
            <h3 style={h}>Needs your yes ({d.pending.length})</h3>
            {d.pending.length === 0 && <Empty>Nothing is waiting for you.</Empty>}
            {d.pending.map((r: any) => (
              <div key={r.id} style={{ borderTop: `1px solid ${C.border}`, padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{AGENT[r.agent_key] ?? r.agent_key} · {when(r.created_at)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {CHECK.includes(r.action_type)
                      ? <Link href="/staff-centre/ai-command-centre/approvals"><button style={btn('gold')}>Check in Approvals</button></Link>
                      : <button style={btn('gold')} disabled={busy === r.id} onClick={() => decide(r, 'approve')}>{busy === r.id ? 'Working…' : 'Approve'}</button>}
                    <button style={btn()} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Read'}</button>
                    <button style={btn()} disabled={busy === r.id} onClick={() => decide(r, 'reject')}>Reject</button>
                  </div>
                </div>
                {open === r.id && <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: '#F5F7FB', borderRadius: 8, padding: 10, marginTop: 8 }}>{r.draft_body}</div>}
              </div>
            ))}
            {d.pending.length > 0 && <div style={{ marginTop: 8, fontSize: 12 }}><Link href="/staff-centre/ai-command-centre/approvals">Open AI Approvals to edit wording first</Link></div>}
          </div>
          {d.failed.length > 0 && <div style={{ ...box, borderColor: '#F4B7B7' }}><h3 style={{ ...h, color: '#B42318' }}>Failed ({d.failed.length})</h3>{d.failed.map((r: any) => <div key={r.id} style={{ fontSize: 13, padding: '4px 0' }}>{r.title}: {r.error}</div>)}</div>}
          <div style={box}>
            <h3 style={h}>Went out in the last 24 hours ({d.sent.length})</h3>
            {d.sent.length === 0 && <Empty>Nothing has gone out.</Empty>}
            {d.sent.map((r: any) => <div key={r.id} style={{ fontSize: 13, padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{r.title}</span><span style={{ color: C.muted, flexShrink: 0 }}>{r.decision_note === 'Sent automatically' ? 'Automatic' : r.decided_by_name ?? ''} · {when(r.executed_at)}</span></div>)}
          </div>
          <div style={box}>
            <h3 style={h}>Came in ({cameIn.length})</h3>
            {cameIn.length === 0 && <Empty>No new enquiries, leads or contacts.</Empty>}
            {cameIn.slice(0, 20).map((t, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>{t}</div>)}
            {cameIn.length > 0 && <div style={{ marginTop: 8, fontSize: 12 }}><Link href="/staff-centre/crm">Open the CRM</Link></div>}
          </div>
          <div style={box}>
            <h3 style={h}>Also needs attention</h3>
            {attention.length === 0 && <Empty>Nothing else is urgent.</Empty>}
            {attention.map(i => <div key={i.key} style={{ fontSize: 13, padding: '3px 0' }}><Link href={i.href}>{i.count} {i.label.toLowerCase()}</Link></div>)}
          </div>
        </>}
      </Body>
    </CrmPage>
  )
}
