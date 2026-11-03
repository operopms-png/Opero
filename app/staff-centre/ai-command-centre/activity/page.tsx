'use client'
// AI Command Centre -> Activity log: what the agents did and what people decided.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const NAME: Record<string, string> = { guest: 'Guest agent', cleaning: 'Cleaning', maintenance: 'Maintenance', revenue: 'Pricing', owner: 'Owner reports', leads: 'Leads', portal: 'Portal chat', pm_compliance: 'Compliance', pm_renewals: 'Renewals', pm_arrears: 'Arrears', ea_viewings: 'Viewings', ea_listings: 'Listings', dev_investors: 'Investor updates', rent_match: 'Rent matching', doc_reader: 'Document reader', pm_insurance: 'Insurance', maint_followup: 'Maintenance follow-up', maint_predict: 'Predictive maintenance', keys_check: 'Key checks', head_lease_watch: 'Head lease watch', risk_alerts: 'Sublet risk alerts', hmo_licence: 'HMO licences', utilities_watch: 'Utility bills', mortgage_watch: 'Mortgage watch', tenant_checks: 'Tenant checks', expense_sorter: 'Expense sorter', invoice_chase: 'Invoice chase', tax_watch: 'Tax deadlines', partner_payouts: 'Partner payouts', smart_watch: 'Smart home watch', review_replies: 'Review replies', dev_milestones: 'Milestone chaser', dev_budget: 'Budget watch', dev_snags: 'Snag chaser', dev_compliance: 'Development approvals', dev_safety: 'Site safety watch', hr_watch: 'People and HR', applications_watch: 'Applications watch', team_weekly: 'Team summary', market_forecast: 'Market forecast', weekly_report: 'Weekly report', portfolio: 'Portfolio review', onboarding: 'Import', chief: 'Chief of Staff' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Activity() {
  const [items, setItems] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ items: any[] }>('/api/ai-activity').then(d => setItems(d.items)).catch(e => setErr(e.message)) }, [])
  return (
    <CrmPage>
      <CrmHeader title="Activity log" subtitle="What the AI agents did, and what your team decided on their drafts. Newest first." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!items ? (!err && <Loading />) : items.length === 0 ? <Empty>No activity yet.</Empty> : (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8 }}>
            {items.map((i, n) => (
              <div key={n} style={{ display: 'flex', gap: 14, padding: '10px 14px', borderBottom: n < items.length - 1 ? '1px solid ' + C.border : 0, fontSize: 13.5, flexWrap: 'wrap' }}>
                <span style={{ color: C.faint, minWidth: 118 }}>{when(i.at)}</span>
                <span style={{ fontWeight: 600, minWidth: 110 }}>{NAME[i.agent] ?? i.agent}</span>
                <span style={{ flex: 1, minWidth: 180 }}>{i.text}{i.note ? <span style={{ color: C.muted }}> · {i.note}</span> : null}{i.reason ? <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Why: {i.reason}</div> : null}{i.by ? <div style={{ fontSize: 12.5, color: C.muted }}>Authorised by: {i.by}</div> : null}</span>
              </div>))}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
