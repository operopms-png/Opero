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
const AGENT: Record<string, string> = { guest: 'Guest agent', cleaning: 'Cleaning', maintenance: 'Maintenance', revenue: 'Pricing', owner: 'Owner reports', portal: 'Portal chat', pm_compliance: 'Compliance', pm_renewals: 'Renewals', pm_arrears: 'Arrears', ea_viewings: 'Viewings', ea_listings: 'Listings', dev_investors: 'Investor updates', rent_match: 'Rent matching', doc_reader: 'Document reader', pm_insurance: 'Insurance', maint_followup: 'Maintenance follow-up', maint_predict: 'Predictive maintenance', keys_check: 'Key checks', rent_review_watch: 'Rent reviews', service_charge_watch: 'Service charges', planned_maintenance_watch: 'Planned maintenance', head_lease_watch: 'Head lease watch', risk_alerts: 'Sublet risk alerts', hmo_licence: 'HMO licences', utilities_watch: 'Utility bills', mortgage_watch: 'Mortgage watch', tenant_checks: 'Tenant checks', expense_sorter: 'Expense sorter', invoice_chase: 'Invoice chase', tax_watch: 'Tax deadlines', partner_payouts: 'Partner payouts', smart_watch: 'Smart home watch', review_replies: 'Review replies', dev_milestones: 'Milestone chaser', dev_budget: 'Budget watch', dev_snags: 'Snag chaser', dev_compliance: 'Development approvals', dev_safety: 'Site safety watch', hr_watch: 'People and HR', applications_watch: 'Applications watch', team_weekly: 'Team summary', market_forecast: 'Market forecast', weekly_report: 'Weekly report', portfolio: 'Portfolio review', onboarding: 'Import', chief: 'Chief of Staff' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AiApprovals() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('pending')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, boolean>>({})

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

  // Bulk approve: sends each ticked draft as written, one after another. Rate changes and record
  // corrections are left out because they need checking by eye.
  const bulkApprove = async () => {
    const ids = Object.keys(picked).filter(id => picked[id])
    if (!ids.length) return
    if (!window.confirm(`Approve and send ${ids.length} draft${ids.length === 1 ? '' : 's'} exactly as written?`)) return
    setBusy('bulk')
    let failed = 0
    for (const id of ids) {
      const r = (rows ?? []).find(x => x.id === id)
      try { await staffApi('/api/ai-approvals', { id, action: 'approve', body: edits[id] ?? r?.draft_body }) } catch { failed++ }
    }
    setPicked({}); await load(); setBusy(null)
    if (failed) setErr(`${failed} of ${ids.length} could not be sent. They stay in the list with the reason.`)
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
            {tab === 'pending' && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button style={btn('ghost')} onClick={() => { const next: Record<string, boolean> = {}; shown.filter(r => r.action_type !== 'rate_change' && r.action_type !== 'lease_update' && r.action_type !== 'import_records').forEach(r => { next[r.id] = !Object.values(picked).some(Boolean) }); setPicked(next) }}>
                  {Object.values(picked).some(Boolean) ? 'Clear selection' : 'Select all'}
                </button>
                <button style={btn('gold')} disabled={busy === 'bulk' || !Object.values(picked).some(Boolean)} onClick={bulkApprove}>
                  {busy === 'bulk' ? 'Sending…' : `Approve selected (${Object.values(picked).filter(Boolean).length})`}
                </button>
              </div>
            )}
            {shown.map(r => {
              const st = ST[r.status] ?? ST.pending
              const open = r.status === 'pending' || r.status === 'failed'
              const isRate = r.action_type === 'rate_change'
              return (
                <div key={r.id} style={{ border: '1px solid ' + C.border, borderRadius: 6, padding: 16, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {open && !isRate && r.action_type !== 'lease_update' && r.action_type !== 'import_records' && <input type="checkbox" checked={!!picked[r.id]} onChange={e => setPicked({ ...picked, [r.id]: e.target.checked })} style={{ marginTop: 4 }} />}
                      <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{AGENT[r.agent_key] ?? r.agent_key}{r.property_name ? ` · ${r.property_name}` : ''} · {when(r.created_at)}</div>
                      </div>
                    </div>
                    <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: st.bg, color: st.c }}>{st.l}</span>
                  </div>
                  {r.context?.summary && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}><b>Based on:</b> {r.context.summary}{r.payload?.to ? ` · will be emailed to ${r.payload.to}` : ''}</div>}
                  {r.context?.market && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}><b>Market (live web search, {r.context.market.confidence} confidence):</b> {r.context.market.symbol}{r.context.market.low} to {r.context.market.symbol}{r.context.market.high}, typical {r.context.market.symbol}{r.context.market.typical}. {r.context.market.basis}{(r.context.market.comparables ?? []).filter((c: any) => c.url).length > 0 && <div style={{ marginTop: 4 }}>{(r.context.market.comparables as any[]).filter(c => c.url).map((c, i) => <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ marginRight: 10, color: '#1B2F6E' }}>{c.source || 'Listing'} {c.price_text}</a>)}</div>}</div>}
                  {r.context?.guest_message && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10, whiteSpace: 'pre-wrap' }}><b>Guest wrote:</b> {r.context.guest_message}</div>}
                  {r.context?.incoming && <div style={{ fontSize: 13, color: C.muted, background: C.hover, borderRadius: 4, padding: '8px 10px', marginBottom: 10, whiteSpace: 'pre-wrap' }}><b>{r.context.incoming_from || 'They'} wrote:</b> {r.context.incoming}</div>}
                  {open ? (
                    <>
                      {r.action_type === 'lease_update' || r.action_type === 'import_records' ? (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, background: C.hover, borderRadius: 4, padding: '10px 12px' }}>{r.draft_body}{r.payload?.doc_url && <div style={{ marginTop: 8 }}><a href={r.payload.doc_url} target="_blank" rel="noreferrer" style={{ color: '#1B2F6E', fontWeight: 600 }}>Open the document</a></div>}</div>
                      ) : isRate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, color: C.muted }}>Now {r.context?.market?.symbol ?? '£'}{r.payload?.current_rate}. New nightly rate: {r.context?.market?.symbol ?? '£'}</span>
                          <input style={{ ...input, width: 110 }} inputMode="decimal" value={edits[r.id] ?? r.draft_body} onChange={e => setEdits({ ...edits, [r.id]: e.target.value })} />
                        </div>
                      ) : (
                        <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} value={edits[r.id] ?? r.draft_body} onChange={e => setEdits({ ...edits, [r.id]: e.target.value })} />
                      )}
                      {r.status === 'failed' && <div style={{ color: C.red, fontSize: 12.5, marginTop: 6 }}>Last attempt failed: {r.error}</div>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button style={btn('gold')} disabled={busy === r.id} onClick={() => decide(r, 'approve')}>{busy === r.id ? 'Working…' : isRate ? 'Approve & change rate' : r.action_type === 'mark_rent_paid' ? 'Approve & mark paid' : r.action_type === 'listing_description' ? 'Approve & save' : r.action_type === 'import_records' ? 'Approve & import' : r.action_type === 'lease_update' ? 'Approve & update record' : 'Approve & send'}</button>
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
