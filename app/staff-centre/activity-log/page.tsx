'use client'
// Human Intelligence Hub → Team → Activity Log: who changed what, and when.
// Admins and co-founders see every change in their company; everyone else sees only their own
// (enforced in the database by the pm_audit_log read policy). Changes made by the AI or by an
// automatic job show as "Novourq Cloud AI or system".
import React, { useEffect, useMemo, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty } from '../../../components/crm/Page'
import { supabase } from '../../../lib/supabase'

const AREAS: Record<string, { label: string; tables: string[] }> = {
  all: { label: 'Everything', tables: [] },
  property: { label: 'Properties and leases', tables: ['pm_properties', 'pm_units', 'pm_leases', 'pm_head_leases', 'pm_keys', 'pm_valuations'] },
  people: { label: 'Owners and tenants', tables: ['pm_landlords', 'pm_tenants', 'pm_referrals'] },
  money: { label: 'Money', tables: ['pm_rent_payments', 'pm_transactions', 'invoices'] },
  ops: { label: 'Operations and legal', tables: ['pm_maintenance', 'pm_documents', 'pm_insurance_policies', 'pm_legal_cases'] },
}
const NAMES: Record<string, string> = {
  pm_properties: 'Property', pm_units: 'Unit', pm_leases: 'Lease', pm_head_leases: 'Head lease', pm_keys: 'Key set', pm_valuations: 'Valuation',
  pm_landlords: 'Owner', pm_tenants: 'Tenant', pm_referrals: 'Referral', pm_rent_payments: 'Rent payment', pm_transactions: 'Bank transaction',
  invoices: 'Invoice', pm_maintenance: 'Maintenance job', pm_documents: 'Document', pm_insurance_policies: 'Insurance policy', pm_legal_cases: 'Legal matter',
}
const SKIP = new Set(['updated_at', 'created_at'])
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const nice = (k: string) => k.replace(/_/g, ' ')

function summary(a: any): string {
  if (a.action === 'insert') return 'New record'
  if (a.action === 'delete') return 'Record removed'
  const b = a.changes?.before, n = a.changes?.after
  if (!b || !n) return '—'
  const keys = Object.keys(n).filter(k => !SKIP.has(k) && JSON.stringify(b[k]) !== JSON.stringify(n[k]))
  if (!keys.length) return '—'
  return keys.slice(0, 4).map(k => {
    const v = (x: any) => x == null || x === '' ? 'empty' : typeof x === 'object' ? '…' : String(x).slice(0, 30)
    return keys.length <= 3 ? `${nice(k)}: ${v(b[k])} → ${v(n[k])}` : nice(k)
  }).join('; ') + (keys.length > 4 ? ` and ${keys.length - 4} more` : '')
}

export default function ActivityLog() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [area, setArea] = useState('all')
  const [who, setWho] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('pm_audit_log').select('id,created_at,table_name,action,changes,changed_by,changed_by_email,record_label,record_id')
      .order('created_at', { ascending: false }).limit(500)
      .then(({ data, error }) => { if (error) setErr(error.message); setRows(data ?? []) })
  }, [])

  const people = useMemo(() => Array.from(new Set((rows ?? []).map(r => r.changed_by_email || '').filter(Boolean))).sort(), [rows])
  const shown = useMemo(() => (rows ?? []).filter(r =>
    (area === 'all' || AREAS[area].tables.includes(r.table_name)) &&
    (who === 'all' || (who === 'system' ? !r.changed_by_email : r.changed_by_email === who)) &&
    (!q.trim() || `${r.record_label ?? ''} ${NAMES[r.table_name] ?? r.table_name}`.toLowerCase().includes(q.trim().toLowerCase()))
  ), [rows, area, who, q])

  const pill = (on: boolean): React.CSSProperties => ({ padding: '6px 14px', borderRadius: 14, border: `1px solid ${on ? '#2F6DB5' : '#D0D5DD'}`, background: on ? '#EAF3FC' : '#fff', color: on ? '#1D4E89' : '#344054', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' })
  const field: React.CSSProperties = { padding: '7px 11px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', background: '#fff' }

  return (
    <CrmPage>
      <CrmHeader title="Activity Log" subtitle="A record of who changed what, and when, across your properties, people, money and operations." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!rows ? (!err && <Loading />) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {Object.entries(AREAS).map(([k, v]) => <button key={k} onClick={() => setArea(k)} style={pill(area === k)}>{v.label}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a name or record" style={{ ...field, minWidth: 200 }} />
              <select value={who} onChange={e => setWho(e.target.value)} style={field}>
                <option value="all">Everyone</option>
                {people.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="system">Novourq Cloud AI or system</option>
              </select>
            </div>
            {shown.length === 0 ? <Empty>No changes recorded yet. New changes appear here as your team works.</Empty> : (
              <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'auto' }}>
                <div style={{ minWidth: 760 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1.1fr 90px 1.3fr 1.6fr', padding: '11px 18px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    <span>When</span><span>Who</span><span>Action</span><span>What</span><span>Changed</span>
                  </div>
                  {shown.map(r => (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '150px 1.1fr 90px 1.3fr 1.6fr', padding: '11px 18px', borderBottom: '1px solid #F2F4F7', fontSize: 13, color: '#344054', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12 }}>{when(r.created_at)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.changed_by_email || 'Novourq Cloud AI or system'}</span>
                      <span style={{ textTransform: 'capitalize' }}>{r.action === 'insert' ? 'Added' : r.action === 'delete' ? 'Removed' : 'Edited'}</span>
                      <span><b style={{ fontWeight: 600, color: '#10234d' }}>{NAMES[r.table_name] ?? nice(r.table_name.replace(/^pm_/, ''))}</b>{r.record_label ? ` · ${r.record_label}` : ''}</span>
                      <span style={{ color: '#667085', fontSize: 12.5 }}>{summary(r)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#667085', marginTop: 10 }}>Shows the latest 500 changes. Bank and ID details are never stored in this log.</div>
          </>
        )}
      </Body>
    </CrmPage>
  )
}
