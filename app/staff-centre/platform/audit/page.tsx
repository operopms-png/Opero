'use client'
// Platform Owner → Audit Log: every recorded change across every client company. Owner login only.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../../components/crm/Page'
import { ownerFetch } from '../../../../lib/platform-fetch'

const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const nice = (k: string) => k.replace(/^pm_/, '').replace(/_/g, ' ')
const ACTION: Record<string, string> = { INSERT: '#00C875', UPDATE: '#579BFC', DELETE: '#DF2F4A' }

export default function PlatformAuditPage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [client, setClient] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { setD(null); ownerFetch('/api/platform/audit' + (client ? '?client=' + client : '')).then(r => r.ok ? setD(r.data) : setErr(r.data?.error || 'Could not load')) }, [client])
  if (err) return <CrmPage><CrmHeader title="Audit Log" /><Body><Empty>{err}</Empty></Body></CrmPage>
  if (!d) return <Loading />
  const rows = (d.rows as any[]).filter(r => !q || JSON.stringify([r.client, r.table_name, r.record_label, r.changed_by_email, r.action]).toLowerCase().includes(q.toLowerCase()))
  return (
    <CrmPage>
      <CrmHeader theme="blue" title="Audit Log" subtitle="Every recorded change across every client, newest first. Only your login can see this."
        actions={<>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid ' + C.border, fontFamily: 'inherit', fontSize: 13, width: 160 }} />
          <select value={client} onChange={e => setClient(e.target.value)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid ' + C.border, fontFamily: 'inherit', fontSize: 13 }}>
            <option value="">All clients</option>{d.clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>} />
      <Body>
        {rows.length === 0 ? <Empty>No changes recorded.</Empty> : (
          <div style={{ background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ background: '#F5F6F8', textAlign: 'left', color: C.muted, fontSize: 12 }}>
                {['When', 'Client', 'Who', 'What', 'Record'].map(h => <th key={h} style={{ padding: '10px 14px', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid ' + C.row, verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: C.muted }}>{when(r.created_at)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.client}</td>
                  <td style={{ padding: '10px 14px' }}>{r.changed_by_email || 'Novourq Cloud AI or system'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><span style={{ background: ACTION[String(r.action).toUpperCase()] || '#9699A6', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 }}>{String(r.action).toLowerCase()}</span> <span style={{ textTransform: 'capitalize' }}>{nice(r.table_name)}</span></td>
                  <td style={{ padding: '10px 14px', color: C.muted }}>{r.record_label || '—'}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.faint, marginTop: 12 }}>Showing the latest {d.rows.length} changes. Each company's own team sees only their company in Team → Activity Log.</div>
      </Body>
    </CrmPage>
  )
}
