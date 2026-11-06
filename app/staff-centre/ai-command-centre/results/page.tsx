'use client'
// Staff Centre -> AI Command Centre -> AI Results. What the agents drafted over the last 30 days
// and what people did with it. Counted from the approvals queue.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const NAME: Record<string, string> = { guest: 'Guest agent', cleaning: 'Cleaning', maintenance: 'Maintenance', revenue: 'Pricing', owner: 'Owner reports', portal: 'Portal chat', pm_compliance: 'Compliance', pm_renewals: 'Renewals', pm_arrears: 'Arrears', ea_viewings: 'Viewings', ea_listings: 'Listings', dev_investors: 'Investor updates', rent_match: 'Rent matching', doc_reader: 'Document reader', pm_insurance: 'Insurance', maint_followup: 'Maintenance follow-up', maint_predict: 'Predictive maintenance', keys_check: 'Key checks', rent_review_watch: 'Rent reviews', service_charge_watch: 'Service charges', planned_maintenance_watch: 'Planned maintenance', head_lease_watch: 'Head lease watch', risk_alerts: 'Sublet risk alerts', hmo_licence: 'HMO licences', utilities_watch: 'Utility bills', mortgage_watch: 'Mortgage watch', tenant_checks: 'Tenant checks', expense_sorter: 'Expense sorter', invoice_chase: 'Invoice chase', tax_watch: 'Tax deadlines', partner_payouts: 'Partner payouts', smart_watch: 'Smart home watch', review_replies: 'Review replies', dev_milestones: 'Milestone chaser', dev_budget: 'Budget watch', dev_snags: 'Snag chaser', dev_compliance: 'Development approvals', dev_safety: 'Site safety watch', hr_watch: 'People and HR', applications_watch: 'Applications watch', team_weekly: 'Team summary', market_forecast: 'Market forecast', weekly_report: 'Weekly report', portfolio: 'Portfolio review', onboarding: 'Import', chief: 'Chief of Staff' }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + '%' : '-')
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: C.muted, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid ' + C.border }
const td: React.CSSProperties = { fontSize: 13.5, padding: '10px', borderBottom: '1px solid ' + C.border }

export default function AiResults() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi('/api/ai-results').then(setD).catch(e => setErr(e.message)) }, [])
  return (
    <CrmPage>
      <CrmHeader title="AI Results" subtitle="What the AI agents drafted in the last 30 days, and what your team did with it." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : d.agents.length === 0 ? <Empty>No AI drafts in the last 30 days.</Empty> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 18 }}>
              {[['Drafted', d.total.drafted], ['Approved and sent', d.total.sent], ['Edited before sending', d.total.edited], ['Rejected', d.total.rejected], ['Estimated hours saved', d.hoursSaved]].map(([l, v]) => (
                <div key={l as string} style={{ border: '1px solid ' + C.border, borderRadius: 8, padding: 14, background: '#fff' }}>
                  <div style={{ fontSize: 12, color: C.muted }}>{l}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
                </div>))}
            </div>
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Agent', 'Drafted', 'Sent', 'Sent unchanged', 'Rejected', 'Expired', 'Failed', 'Waiting', 'Median time to decide'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{d.agents.map((a: any) => (
                  <tr key={a.agent}>
                    <td style={{ ...td, fontWeight: 600 }}>{NAME[a.agent] ?? a.agent}</td>
                    <td style={td}>{a.drafted}</td><td style={td}>{a.sent}</td><td style={td}>{pct(a.sent - a.edited, a.sent)}</td>
                    <td style={td}>{a.rejected}</td><td style={td}>{a.expired}</td><td style={td}>{a.failed}</td><td style={td}>{a.waiting}</td>
                    <td style={td}>{a.medianMinutes == null ? '-' : a.medianMinutes < 90 ? a.medianMinutes + ' min' : Math.round(a.medianMinutes / 60) + ' h'}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Hours saved is an estimate: {d.minutesSavedPerApproved} minutes for every approved draft. A high &quot;sent unchanged&quot; rate means the agent is writing what your team would have written.</p>
          </>
        )}
      </Body>
    </CrmPage>
  )
}
