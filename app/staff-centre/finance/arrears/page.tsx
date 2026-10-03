'use client'
// Staff Centre → Finance → Arrears: every tenant behind on rent across Property
// Management and Estate Agency in one list, longest overdue first. Text the
// tenant straight from the row, or mark the rent paid (admins).
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi, money, MODULE_LABEL, MODULE_COL } from '../../../../lib/staff-api'
import { TextButton } from '../../../../components/TextComposer'

export default function Arrears() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const load = () => staffApi('/api/finance?view=arrears').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  async function paid(r: any) {
    if (!confirm(`Mark ${r.tenant}'s ${money(r.amount, r.currency)} as paid?`)) return
    setBusy(r.id)
    try { await staffApi('/api/finance', { action: 'rent-paid', module: r.module, id: r.id }); await load() } catch (e: any) { alert(e.message) }
    setBusy(null)
  }
  const total = (rows: any[]) => { const o: Record<string, number> = {}; rows.forEach(r => { o[r.currency] = (o[r.currency] || 0) + (Number(r.amount) || 0) }); return Object.entries(o).map(([c, v]) => money(v, c)).join(' + ') || '—' }
  const rows: any[] = d?.rows || []
  return (
    <CrmPage>
      <CrmHeader title="Rent arrears" subtitle="Tenants behind on rent across Property Management and Estate Agency, longest overdue first." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Tenants behind" value={<span style={{ color: rows.length ? C.red : C.ink }}>{rows.length}</span>} sub={total(rows)} highlight />
            <Stat label="Over 30 days" value={rows.filter(r => r.days > 30).length} sub={total(rows.filter(r => r.days > 30))} />
            <Stat label="Under 7 days" value={rows.filter(r => r.days <= 7).length} sub="A reminder text usually sorts these" />
          </div>
          <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden' }}>
            {rows.length === 0 ? <div style={{ padding: 18 }}><Empty>No one is behind on rent.</Empty></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 760 }}>
                  <thead><tr style={{ background: '#F7F8FA' }}>{['Tenant', 'Property', 'Was due', 'Late', 'Owed', ''].map((h, i) => <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '9px 18px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
                  <tbody>{rows.map(r => (
                    <tr key={r.module + r.id} style={{ borderTop: '1px solid #F0F1F4' }}>
                      <td style={td}><div style={{ fontWeight: 600 }}>{r.tenant}</div><div style={{ fontSize: 11.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COL[r.module], display: 'inline-block' }} />{MODULE_LABEL[r.module]}{r.phone ? ` · ${r.phone}` : ''}</div></td>
                      <td style={td}>{r.property || '—'}</td>
                      <td style={td}>{new Date(r.due_date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<div style={{ fontSize: 11.5, color: C.muted }}>{r.what}</div></td>
                      <td style={{ ...td, fontWeight: 700, color: r.days > 30 ? C.red : r.days > 7 ? '#9A6400' : C.ink }}>{r.days} day{r.days === 1 ? '' : 's'}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(r.amount, r.currency)}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {r.phone && <TextButton phone={r.phone} name={r.tenant} style={{ marginRight: 6 }} />}
                        <button disabled={busy === r.id} onClick={() => paid(r)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#191815', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{busy === r.id ? '…' : 'Mark paid'}</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </>}
      </Body>
    </CrmPage>
  )
}
const td: React.CSSProperties = { padding: '11px 18px', verticalAlign: 'top', color: C.ink }
