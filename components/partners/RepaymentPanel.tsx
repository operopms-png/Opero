'use client'
// Monthly repayments back to a funding partner.
// Staff (ownerId given): edit the amount invested, build the schedule, mark each month paid. Partner: the same schedule, read only.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { buildSchedule, money, addMonths } from '../../lib/partner-schedule'

const ACCENT = '#89CFF0', INK = '#323338', MUTE = '#667085', LINE = '#E6E9EF'
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #D0D4E4', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
const btn: React.CSSProperties = { background: ACCENT, color: '#fff', border: 'none', borderRadius: 4, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { background: '#fff', color: INK, border: '1px solid #D0D4E4', borderRadius: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const day = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const today = () => new Date().toISOString().slice(0, 10)

type Row = { id: string; due_on: string; amount: number; paid_on: string | null }

export default function RepaymentPanel({ ownerId }: { ownerId?: string }) {
  const [owner, setOwner] = useState<{ id: string; name: string; invested: number; currency: string } | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false)
  const [f, setF] = useState({ invested: '', currency: 'JMD', start: '', mode: 'fixed', monthly: '', pct: '40', net: '' })

  const headers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
  }, [])

  const load = useCallback(async () => {
    const r = await fetch('/api/partner-repayments' + (ownerId ? `?owner_id=${ownerId}` : ''), { headers: await headers() })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(j.error || 'Could not load'); setLoaded(true); return }
    setOwner(j.owner); setRows((j.rows ?? []).map((x: any) => ({ ...x, amount: Number(x.amount) })))
    setF(p => ({ ...p, invested: String(j.owner.invested || ''), currency: j.owner.currency || 'JMD', start: p.start || (j.rows?.find((x: any) => !x.paid_on)?.due_on ?? addMonths(today(), 1)), monthly: p.monthly || String(j.rows?.[0]?.amount ?? '') }))
    setLoaded(true)
  }, [ownerId, headers])
  useEffect(() => { load() }, [load])

  async function save() {
    setBusy(true); setErr('')
    const r = await fetch('/api/partner-repayments', { method: 'PUT', headers: await headers(), body: JSON.stringify({ owner_id: ownerId, invested: Number(f.invested), currency: f.currency, plan: { start: f.start, mode: f.mode, monthly: Number(f.monthly), pct: Number(f.pct), net: Number(f.net) } }) })
    const j = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Could not save'); return }
    load()
  }
  async function mark(row: Row) {
    setBusy(true)
    await fetch('/api/partner-repayments', { method: 'PATCH', headers: await headers(), body: JSON.stringify({ id: row.id, paid: !row.paid_on }) })
    setBusy(false); load()
  }

  if (!loaded) return <div style={{ fontSize: 13, color: '#98A2B3' }}>Loading…</div>
  if (!owner) return <div style={{ fontSize: 13, color: '#B42318' }}>{err || 'Not found'}</div>
  const cur = owner.currency
  const paid = rows.filter(r => r.paid_on), repaid = paid.reduce((s, r) => s + r.amount, 0)
  const left = Math.max(0, owner.invested - repaid), pct = owner.invested > 0 ? Math.min(100, (repaid / owner.invested) * 100) : 0
  const next = rows.find(r => !r.paid_on)
  const preview = ownerId ? buildSchedule({ invested: Math.max(0, Number(f.invested) - repaid), start: f.start, mode: f.mode as any, monthly: Number(f.monthly), pct: Number(f.pct), net: Number(f.net) }) : []
  const kpi = (l: string, v: string, s?: string) => <div><div style={{ fontSize: 12, color: MUTE }}>{l}</div><div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{v}</div>{s && <div style={{ fontSize: 11, color: MUTE }}>{s}</div>}</div>
  const lbl = (t: string) => <div style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 4 }}>{t}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {kpi('Invested', money(owner.invested, cur))}
        {kpi('Repaid so far', money(repaid, cur), `${paid.length} repayment${paid.length === 1 ? '' : 's'}`)}
        {kpi('Still to repay', money(left, cur), `${rows.filter(r => !r.paid_on).length} months to go`)}
        {kpi('Next repayment', next ? money(next.amount, cur) : '-', next ? day(next.due_on) : rows.length ? 'Fully repaid' : 'No schedule yet')}
      </div>
      <div style={{ height: 10, background: '#EEF0F4', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: ACCENT }} /></div>
      <div style={{ fontSize: 12, color: MUTE, marginTop: -6 }}>{pct.toFixed(0)}% repaid{rows.length ? ` · fully repaid by ${day(rows[rows.length - 1].due_on)} at this rate` : ''}</div>

      {ownerId && (
        <div style={{ background: '#F9FAFB', border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Investment and repayment plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div>{lbl('Initial investment')}<input type="number" min={0} style={input} value={f.invested} onChange={e => setF({ ...f, invested: e.target.value })} /></div>
            <div>{lbl('Currency')}<select style={input} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}><option value="JMD">J$ Jamaican dollar</option><option value="GBP">£ Pound sterling</option></select></div>
            <div>{lbl('First repayment')}<input type="date" style={input} value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></div>
            <div>{lbl('Repay by')}<select style={input} value={f.mode} onChange={e => setF({ ...f, mode: e.target.value })}><option value="fixed">Fixed amount each month</option><option value="pct">Share of monthly net income</option></select></div>
            {f.mode === 'fixed'
              ? <div>{lbl('Monthly repayment')}<input type="number" min={0} style={input} value={f.monthly} onChange={e => setF({ ...f, monthly: e.target.value })} /></div>
              : <><div>{lbl('Share of net income (%)')}<input type="number" min={1} max={100} style={input} value={f.pct} onChange={e => setF({ ...f, pct: e.target.value })} /></div>
                <div>{lbl('Expected monthly net')}<input type="number" min={0} style={input} value={f.net} onChange={e => setF({ ...f, net: e.target.value })} /></div></>}
          </div>
          <div style={{ fontSize: 12, color: MUTE, margin: '10px 0' }}>
            {preview.length ? `${preview.length} months, ${money(preview[0].amount, f.currency)} a month, last one ${day(preview[preview.length - 1].due_on)}.` : 'Enter an amount, a repayment and a first repayment date.'}
            {paid.length > 0 && ' Months already marked paid are kept; saving rebuilds the rest.'}
          </div>
          <button style={btn} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save and build schedule'}</button>
          {err && <span style={{ color: '#B42318', fontSize: 12, marginLeft: 10 }}>{err}</span>}
        </div>
      )}

      <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, maxHeight: 380, overflow: 'auto' }}>
        {rows.length === 0 && <div style={{ padding: 14, fontSize: 13, color: '#98A2B3' }}>{ownerId ? 'No schedule yet. Fill in the plan above.' : 'Your repayment schedule will appear here once it is set up.'}</div>}
        {rows.map((r, i) => {
          const late = !r.paid_on && r.due_on < today()
          const label = r.paid_on ? `Paid ${day(r.paid_on)}` : late ? 'Late' : r === next ? 'Next' : 'Upcoming'
          const col = r.paid_on ? ['#E7F6EC', '#067647'] : late ? ['#FEE4E2', '#B42318'] : ['#F2F4F7', '#475467']
          return (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i ? `1px solid ${LINE}` : 'none', flexWrap: 'wrap' }}>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{day(r.due_on)}</div><div style={{ fontSize: 12, color: MUTE }}>Month {i + 1}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ fontSize: 14 }}>{money(r.amount, cur)}</b>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: col[0], color: col[1], whiteSpace: 'nowrap' }}>{label}</span>
                {ownerId && <button style={ghost} disabled={busy} onClick={() => mark(r)}>{r.paid_on ? 'Undo' : 'Mark paid'}</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
