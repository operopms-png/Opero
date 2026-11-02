'use client'
// Staff Centre → AI Approvals. Everything an AI agent drafts waits here until a
// person approves (optionally after editing) or rejects it. Nothing is sent before that.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'

const ST: Record<string, { l: string; bg: string; c: string }> = {
  pending: { l: 'Waiting', bg: '#FFF4DE', c: '#8A5A00' },
  executed: { l: 'Sent', bg: '#E6F7EF', c: '#0E7C55' },
  rejected: { l: 'Rejected', bg: '#FDECEC', c: '#B42318' },
  failed: { l: 'Failed', bg: '#FDECEC', c: '#B42318' },
  approved: { l: 'Sending', bg: '#E8F0FB', c: '#1B2F6E' },
}
const AGENT: Record<string, string> = { guest: 'Guest agent', cleaning: 'Cleaning', maintenance: 'Maintenance', revenue: 'Pricing', owner: 'Owner reports', portal: 'Portal chat', pm_compliance: 'Compliance', pm_renewals: 'Renewals', pm_arrears: 'Arrears' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AiApprovals() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('pending')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => staffApi<{ actions: any[] }>('/api/ai-approvals').then(d => { setRows(d.actions); setErr('') }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const decide = async (r: any, action: 'approve' | 'reject') => {
    setBusy(r.id)
    try {
      await staffApi('/api/ai-approvals', { id: r.id, action, body: action === 'approve' ? (edits[r.id] ?? r.draft_body) : undefined })
      await load()
    } catch (e: any) { setErr(e.message); await load() }
    setBusy(null)
  }

  const all = rows ?? []
  const pending = all.filter(r => r.status === 'pending' || r.status === 'failed')
  const shown = tab === 'pending' ? pending : tab === 'done' ? all.filter(r => r.status === 'executed') : tab === 'rejected' ? all.filter(r => r.status === 'rejected') : all

  return (
    <CrmPage>
      <CrmHeader title="AI Approvals" subtitle="Everything the AI agents draft waits here. Nothing is sent until a team member approves it."
        tabs={[{ k: 'pending', l: 'Waiting', count: pending.length }, { k: 'done', l: 'Sent' }, { k: 'rejected', l: 'Rejected' }, { k: 'all', l: 'All', count: all.length }]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!rows ? (!err && <Loading />) : shown.length === 0 ? <Empty>{tab === 'pending' ? 'Nothing waiting for approval.' : 'Nothing here yet.'}</Empty> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {shown.map(r => {
              const st = ST[r.status] ?? ST.pending
              const open = r.status === 'pending' || r.status === 'failed'
              const isRate = r.action_type === 'rate_change'
              return (
                <div key={r.id} style={{ border: '1px solid ' + C.border, borderRadius: 6, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{AGENT[r.agent_key] ?? r.agent_key}{r.property_name ? ` · ${r.property_name}` : ''} · {when(r.created_at)}</div>
                    </div>
                    <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span>
                  </div>
                  {r.context?.summary && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}><b>Based on:</b> {r.context.summary}{r.payload?.to ? ` · will be emailed to ${r.payload.to}` : ''}</div>}
                  {r.context?.guest_message && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10, whiteSpace: 'pre-wrap' }}><b>Guest wrote:</b> {r.context.guest_message}</div>}
                  {r.context?.incoming && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10, whiteSpace: 'pre-wrap' }}><b>{r.context.incoming_from || 'They'} wrote:</b> {r.context.incoming}</div>}
                  {open ? (
                    <>
                      {isRate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, color: C.muted }}>Now £{r.payload?.current_rate}. New nightly rate: £</span>
                          <input style={{ ...input, width: 110 }} inputMode="decimal" value={edits[r.id] ?? r.draft_body} onChange={e => setEdits({ ...edits, [r.id]: e.target.value })} />
                        </div>
                      ) : (
                        <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} value={edits[r.id] ?? r.draft_body} onChange={e => setEdits({ ...edits, [r.id]: e.target.value })} />
                      )}
                      {r.status === 'failed' && <div style={{ color: C.red, fontSize: 12.5, marginTop: 6 }}>Last attempt failed: {r.error}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button style={btn('gold')} disabled={busy === r.id} onClick={() => decide(r, 'approve')}>{busy === r.id ? 'Working…' : isRate ? 'Approve & change rate' : 'Approve & send'}</button>
                        <button style={btn('danger')} disabled={busy === r.id} onClick={() => decide(r, 'reject')}>Reject</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{isRate ? `Nightly rate £${r.payload?.current_rate} to £${r.final_body || r.draft_body}` : (r.final_body || r.draft_body)}</div>
                      <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
                        {r.decided_by_name ? `${r.status === 'rejected' ? 'Rejected' : 'Approved'} by ${r.decided_by_name}` : ''}{r.decided_at ? ` · ${when(r.decided_at)}` : ''}{r.final_body && r.final_body !== r.draft_body ? ' · edited before sending' : ''}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
