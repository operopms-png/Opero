'use client'
// Staff Centre → Finance → Payouts: money owed to property owners (Property
// Management and Estate Agency "payments to landlord"), oldest first, and what
// was paid recently. Admins can mark a payout paid (or undo it).
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi, money, MODULE_LABEL, MODULE_COL } from '../../../../lib/staff-api'

const fmt = (d?: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function Payouts() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const load = () => staffApi('/api/finance?view=payouts').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  async function mark(r: any, paid: boolean) {
    setBusy(r.id)
    try { await staffApi('/api/finance', { action: 'payout-paid', module: r.module, id: r.id, paid }); await load() } catch (e: any) { alert(e.message) }
    setBusy(null)
  }
  const totals = (rows: any[]) => { const o: Record<string, number> = {}; rows.forEach(r => { o[r.currency] = (o[r.currency] || 0) + (Number(r.amount) || 0) }); return Object.entries(o).map(([c, v]) => money(v, c)).join(' + ') || '—' }
  return (
    <CrmPage>
      <CrmHeader title="Owner payouts" subtitle="What we owe property owners, from Property Management and Estate Agency. Add payouts on each landlord’s page; mark them paid here." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Still to pay" value={d.due.length} sub={totals(d.due)} highlight />
            <Stat label="Overdue" value={<span style={{ color: d.due.some((r: any) => r.overdue) ? C.red : C.ink }}>{d.due.filter((r: any) => r.overdue).length}</span>} sub={totals(d.due.filter((r: any) => r.overdue))} />
            <Stat label="Paid this month" value={d.paid.filter((r: any) => r.paid_date?.slice(0, 7) === d.today.slice(0, 7)).length} sub={totals(d.paid.filter((r: any) => r.paid_date?.slice(0, 7) === d.today.slice(0, 7)))} />
          </div>
          <Table title="Still to pay" rows={d.due} empty="Nothing owed to owners right now." action={r => <button disabled={busy === r.id} onClick={() => mark(r, true)} style={btnDark}>{busy === r.id ? '…' : 'Mark paid'}</button>} dateLabel="Due" dateKey="due_date" />
          <div style={{ height: 18 }} />
          <Table title="Recently paid" rows={d.paid} empty="No payouts recorded yet." action={r => <button disabled={busy === r.id} onClick={() => mark(r, false)} style={btnGhost}>Undo</button>} dateLabel="Paid" dateKey="paid_date" />
        </>}
      </Body>
    </CrmPage>
  )
}

function Table({ title, rows, empty, action, dateLabel, dateKey }: { title: string; rows: any[]; empty: string; action: (r: any) => React.ReactNode; dateLabel: string; dateKey: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', fontWeight: 700, color: C.ink, borderBottom: '1px solid ' + C.row }}>{title} <span style={{ color: C.faint, fontWeight: 400 }}>{rows.length}</span></div>
      {rows.length === 0 ? <div style={{ padding: 18 }}><Empty>{empty}</Empty></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 720 }}>
            <thead><tr style={{ background: '#F7F8FA' }}>{['Owner', 'Property', 'What for', dateLabel, 'Amount', ''].map((h, i) => <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '9px 18px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.module + r.id} style={{ borderTop: '1px solid #F0F1F4' }}>
                <td style={td}><div style={{ fontWeight: 600 }}>{r.landlord || 'Owner'}</div><div style={{ fontSize: 11.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COL[r.module], display: 'inline-block' }} />{MODULE_LABEL[r.module]}</div></td>
                <td style={td}>{r.property || '—'}</td>
                <td style={td}>{r.category || 'Payout'}{r.notes ? <div style={{ fontSize: 11.5, color: C.muted }}>{r.notes}</div> : null}</td>
                <td style={{ ...td, color: r.overdue ? C.red : C.ink, fontWeight: r.overdue ? 700 : 400 }}>{fmt(r[dateKey])}{r.overdue && <div style={{ fontSize: 11 }}>Overdue</div>}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(r.amount, r.currency)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{action(r)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
const td: React.CSSProperties = { padding: '11px 18px', verticalAlign: 'top', color: C.ink }
const btnDark: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: 'none', background: '#191815', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const btnGhost: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', color: C.ink, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
