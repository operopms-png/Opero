'use client'
// Staff Centre → Finance → Partner Payouts: money owed to partners and co-founders.
// Entered by hand (nothing is calculated for them). Admins add payouts and mark them paid.
import React, { useEffect, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty } from '../../../../components/crm/Page'
import { staffApi, money } from '../../../../lib/staff-api'

const fmt = (d?: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const CURRENCIES = ['GBP', 'USD', 'JMD', 'AED']
const blank = { payee_name: '', payee_type: 'Partner', amount: '', currency: 'GBP', due_date: '', notes: '' }

export default function PartnerPayouts() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState<any>(blank)
  const [saving, setSaving] = useState(false)
  const load = () => staffApi('/api/finance?view=partner-payouts').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await staffApi('/api/finance', { action: 'partner-add', ...form }); setForm(blank); await load() } catch (x: any) { alert(x.message) }
    setSaving(false)
  }
  async function mark(r: any, paid: boolean) {
    setBusy(r.id)
    try { await staffApi('/api/finance', { action: 'partner-paid', id: r.id, paid }); await load() } catch (x: any) { alert(x.message) }
    setBusy(null)
  }
  const totals = (rows: any[]) => { const o: Record<string, number> = {}; rows.forEach(r => { o[r.currency] = (o[r.currency] || 0) + (Number(r.amount) || 0) }); return Object.entries(o).map(([c, v]) => money(v, c)).join(' · ') || '' }

  return (
    <CrmPage>
      <CrmHeader title="Partner payouts" subtitle="What we owe partners and co-founders. Entered by hand; mark them paid here." />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 18 }}>
            <Stat label="Still to pay" value={d.due.length} sub={totals(d.due)} highlight />
            <Stat label="Overdue" value={<span style={{ color: d.due.some((r: any) => r.overdue) ? C.red : C.ink }}>{d.due.filter((r: any) => r.overdue).length}</span>} sub={totals(d.due.filter((r: any) => r.overdue))} />
            <Stat label="Paid this month" value={d.paid.filter((r: any) => r.paid_date?.slice(0, 7) === d.today.slice(0, 7)).length} sub={totals(d.paid.filter((r: any) => r.paid_date?.slice(0, 7) === d.today.slice(0, 7)))} />
          </div>

          <form onSubmit={add} style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 18, marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, alignItems: 'end' }}>
            <label style={lbl}>Name<input required value={form.payee_name} onChange={e => setForm({ ...form, payee_name: e.target.value })} style={inp} /></label>
            <label style={lbl}>Type<select value={form.payee_type} onChange={e => setForm({ ...form, payee_type: e.target.value })} style={inp}><option>Partner</option><option>Co-founder</option></select></label>
            <label style={lbl}>Amount<input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inp} /></label>
            <label style={lbl}>Currency<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={inp}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label style={lbl}>Due date<input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={inp} /></label>
            <label style={lbl}>Notes<input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inp} /></label>
            <button type="submit" disabled={saving} style={btnDark}>{saving ? 'Saving…' : 'Add payout'}</button>
          </form>

          <Table title="Still to pay" rows={d.due} empty="Nothing owed to partners or co-founders right now." action={r => <button disabled={busy === r.id} onClick={() => mark(r, true)} style={btnDark}>{busy === r.id ? '…' : 'Mark paid'}</button>} dateLabel="Due" dateKey="due_date" />
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 620 }}>
            <thead><tr style={{ background: '#F7F8FA' }}>{['Name', 'Type', 'Notes', dateLabel, 'Amount', ''].map((h, i) => <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '9px 18px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #F0F1F4' }}>
                <td style={{ ...td, fontWeight: 600 }}>{r.payee_name}</td>
                <td style={td}>{r.payee_type}</td>
                <td style={td}>{r.notes || '—'}</td>
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
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: C.muted }
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid ' + C.border, fontSize: 13.5, fontFamily: 'inherit', color: C.ink, background: '#fff' }
const btnDark: React.CSSProperties = { padding: '9px 14px', borderRadius: 6, border: 'none', background: '#191815', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const btnGhost: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid ' + C.border, background: '#fff', color: C.ink, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
