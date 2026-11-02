'use client'
// AI Command Centre -> Pricing: nightly rate changes the AI has proposed and what happened to them.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'

const ST: Record<string, string> = { pending: 'Waiting', executed: 'Applied', rejected: 'Rejected', failed: 'Failed', approved: 'Applying' }
const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: C.muted, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid ' + C.border }
const td: React.CSSProperties = { fontSize: 13.5, padding: '10px', borderBottom: '1px solid ' + C.border }

export default function Pricing() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { staffApi<{ actions: any[] }>('/api/ai-approvals').then(d => setRows(d.actions.filter(a => a.action_type === 'rate_change'))).catch(e => setErr(e.message)) }, [])
  const waiting = (rows ?? []).filter(r => r.status === 'pending').length
  return (
    <CrmPage>
      <CrmHeader title="Pricing" subtitle="Nightly rate changes proposed by the Revenue manager each Monday. A rate only changes when you approve it, and only within 50% to 200% of the current rate." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        <div style={{ background: '#fff', border: '1px solid ' + C.border, borderLeft: '3px solid #C9A84C', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: C.muted, marginBottom: 16, maxWidth: 760 }}>
          These proposals come from your own booking history over the last 90 days. They do not use competitor or market rates yet, so treat them as a prompt to review, not a market price.
          {waiting > 0 && <> <Link href="/staff-centre/ai-command-centre/approvals" style={{ color: '#1B2F6E', fontWeight: 600 }}>{waiting} waiting for approval.</Link></>}
        </div>
        {!rows ? (!err && <Loading />) : rows.length === 0 ? <Empty>No rate proposals yet. Switch on the Revenue manager under Agents.</Empty> : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Date', 'Property', 'Current', 'Proposed', 'Result', 'Decided by'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{when(r.created_at)}</td><td style={{ ...td, fontWeight: 600 }}>{r.property_name ?? '-'}</td>
                  <td style={td}>{r.payload?.current_rate ?? '-'}</td><td style={td}>{r.final_body || r.draft_body}</td>
                  <td style={td}>{ST[r.status] ?? r.status}</td><td style={td}>{r.decided_by_name ?? '-'}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
