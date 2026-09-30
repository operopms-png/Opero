'use client'
// Landlord Reports: one clear statement per landlord per period, built from
// the records staff already keep (rent, payouts, costs, tenancies, repairs,
// compliance). Used by Property Management (mode 'pm') and Estate Agency
// (mode 'ea'). "Send to landlord" saves a locked snapshot the landlord sees
// in their portal and emails them a summary. The statement prints to PDF.
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { C, Pill, Modal, btn, input, label } from '../crm/Page'

export type Mode = 'pm' | 'ea'
type Period = { key: string; label: string; from: string; to: string }

const T = {
  pm: { landlords: 'pm_landlords', properties: 'pm_properties', payouts: 'pm_landlord_payments', maintenance: 'pm_maintenance', compliance: 'pm_compliance', feeCol: 'management_fee_pct', portal: '/pm-owner-portal' },
  ea: { landlords: 'estate_landlords', properties: 'estate_properties', payouts: 'estate_landlord_payments', maintenance: 'estate_maintenance', compliance: 'estate_compliance', feeCol: 'commission_rate', portal: '/estate-owner-portal' },
}
const PAYOUT_CATEGORIES = ['Rent Share', 'Utility Bill', 'Maintenance Reimbursement', 'Other']
const COST_CATEGORIES = ['Repair', 'Maintenance', 'Cleaning', 'Certificate / compliance', 'Utility bill', 'Furnishing', 'Letting fee', 'Other']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const money = (n: number) => (n < 0 ? '-£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const nice = (d?: string | null) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const inRange = (d: string | null | undefined, p: { from: string; to: string }) => !!d && d.slice(0, 10) >= p.from && d.slice(0, 10) <= p.to
const isDoneJob = (s?: string) => /complete|closed|done|resolved/i.test(s ?? '')

function periods(): Period[] {
  const now = new Date()
  const out: Period[] = []
  for (let i = 0; i < 12; i++) {
    const a = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const b = new Date(a.getFullYear(), a.getMonth() + 1, 0)
    out.push({ key: 'm' + iso(a), label: a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), from: iso(a), to: iso(b) })
  }
  const q = Math.floor(now.getMonth() / 3)
  for (let i = 0; i < 4; i++) {
    const a = new Date(now.getFullYear(), (q - i) * 3, 1)
    const b = new Date(a.getFullYear(), a.getMonth() + 3, 0)
    out.push({ key: 'q' + iso(a), label: `Q${Math.floor(a.getMonth() / 3) + 1} ${a.getFullYear()}`, from: iso(a), to: iso(b) })
  }
  out.push({ key: 'ytd', label: `Year to date ${now.getFullYear()}`, from: `${now.getFullYear()}-01-01`, to: iso(now) })
  return out
}

async function uploadReceipt(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `landlord-receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { alert(error.message); return null }
  return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}

// ---------- The statement itself (shared by staff view, sent copies and the landlord portal) ----------

export type Snapshot = {
  landlord: { name: string; address?: string; bank?: string }
  business: string
  period: { label: string; from: string; to: string }
  issued: string
  summary: { due: number; received: number; arrears: number; pct: number; fee: number; costs: number; net: number; paidOut: number; balance: number }
  rent: { key: string; property: string; tenant: string; due_date: string; amount: number; paid_date: string | null }[]
  deductions: { key: string; date: string; description: string; property: string; receipt_url?: string | null; amount: number; kind: 'fee' | 'cost' }[]
  payouts: { key: string; paid_date: string | null; due_date: string | null; description: string; property: string; receipt_url?: string | null; amount: number }[]
  properties: { id: string; name: string; address: string; let: boolean; tenancies: { tenant: string; rent: number; end: string | null }[]; open: string[]; openCount: number; doneCount: number; certs: { type: string; expiry: string }[] }[]
  note: string
}

function Section({ n, title, right, children }: { n: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid ' + C.gold, paddingBottom: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.goldDark }}>{n}</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{title}</span>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </div>
  )
}

function Table({ cols, rows, total, empty }: { cols: { l: string; w?: string; right?: boolean }[]; rows: React.ReactNode[][]; total?: React.ReactNode[]; empty: string }) {
  const grid = cols.map(c => c.w ?? '1fr').join(' ')
  const cell = (right?: boolean): React.CSSProperties => ({ padding: '8px 10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start', textAlign: right ? 'right' : 'left', minWidth: 0 })
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 560 }}>
        <div style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid ' + C.row }}>
          {cols.map((c, i) => <div key={i} style={{ ...cell(c.right), fontSize: 12, color: C.muted, fontWeight: 500 }}>{c.l}</div>)}
        </div>
        {rows.length === 0 ? <div style={{ padding: '12px 10px', fontSize: 13, color: C.faint }}>{empty}</div> :
          rows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid ' + C.row }}>
              {r.map((v, j) => <div key={j} style={{ ...cell(cols[j].right), color: C.ink }}>{v}</div>)}
            </div>
          ))}
        {total && rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: grid, background: C.cream }}>
            {total.map((v, j) => <div key={j} style={{ ...cell(cols[j].right), fontWeight: 600, color: C.brown }}>{v}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}

const xBtn: React.CSSProperties = { border: 'none', background: 'none', color: C.faint, cursor: 'pointer', fontSize: 15, padding: '0 2px', marginLeft: 6, lineHeight: 1 }

export function StatementView({ snap, edit }: {
  snap: Snapshot
  edit?: {
    toggleRent: (key: string) => void
    addCost: () => void; removeCost: (key: string) => void
    addPayout: () => void; removePayout: (key: string) => void
    linkable: { id: string; name: string }[]; linkProperty: (id: string) => void
    note: string; setNote: (v: string) => void
  }
}) {
  const s = snap.summary
  const today = iso(new Date())
  const owed = s.balance > 0.005
  return (
    <div id="landlord-statement" style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: C.ink }}>
      <div style={{ background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.goldDark, letterSpacing: '0.06em' }}>LANDLORD STATEMENT</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: C.brown, marginTop: 4 }}>{snap.landlord.name}</div>
          {snap.landlord.address && <div style={{ fontSize: 13, color: '#8A7248', marginTop: 2 }}>{snap.landlord.address}</div>}
        </div>
        <div style={{ fontSize: 13, color: '#8A7248', textAlign: 'right', lineHeight: 1.7 }}>
          <div><b style={{ color: C.brown }}>{snap.period.label}</b></div>
          <div>{nice(snap.period.from)} – {nice(snap.period.to)}</div>
          <div>Issued {nice(snap.issued)} · {snap.business}</div>
        </div>
      </div>

      <div style={{ padding: '22px 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))', gap: 10 }}>
          {[
            { l: 'Rent due', v: money(s.due) },
            { l: 'Rent received', v: money(s.received), c: '#00854D' },
            { l: `Our fee (${s.pct}%)`, v: '-' + money(s.fee), c: C.muted },
            { l: 'Costs', v: '-' + money(s.costs), c: C.muted },
            { l: 'Paid to you', v: money(s.paidOut) },
          ].map(x => (
            <div key={x.l} style={{ border: '1px solid ' + C.row, borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: C.muted }}>{x.l}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: x.c ?? C.ink, marginTop: 2, whiteSpace: 'nowrap' }}>{x.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 6, background: owed ? '#FFF4E0' : '#E6F9F0', border: '1px solid ' + (owed ? '#F8D49B' : '#A6E9C9'), flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{owed ? 'Balance still to be paid to you' : s.balance < -0.005 ? 'Paid to you ahead of rent received' : 'Fully paid for this period'}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Rent received {money(s.received)} − fee {money(s.fee)} − costs {money(s.costs)} = {money(s.net)} due to you · {money(s.paidOut)} already paid</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: owed ? '#B76E00' : '#00854D', whiteSpace: 'nowrap' }}>{money(Math.abs(s.balance))}</div>
        </div>

        <Section n={1} title="Rent" right={s.arrears > 0.005 ? <Pill color={C.red} width={0}>{money(s.arrears)} unpaid</Pill> : undefined}>
          {edit && <div className="no-print" style={{ fontSize: 12, color: C.faint, margin: '-2px 0 4px' }}>Click a status to mark rent received or not received.</div>}
          <Table
            cols={[{ l: 'Property', w: '1.3fr' }, { l: 'Tenant', w: '1.2fr' }, { l: 'Due', w: '105px' }, { l: 'Amount', w: '100px', right: true }, { l: 'Received', w: '105px' }, { l: 'Status', w: '110px' }]}
            rows={snap.rent.map(r => {
              const late = !r.paid_date && r.due_date < today
              return [r.property, r.tenant, nice(r.due_date), money(r.amount), r.paid_date ? nice(r.paid_date) : '—',
                <Pill key="s" width={96} color={r.paid_date ? C.green : late ? C.red : C.orange} onClick={edit ? () => edit.toggleRent(r.key) : undefined} title={edit ? 'Click to change' : undefined}>{r.paid_date ? 'Paid' : late ? 'Overdue' : 'Due'}</Pill>]
            })}
            total={['Total', '', '', money(s.due), money(s.received), '']}
            empty="No rent was due in this period."
          />
        </Section>

        <Section n={2} title="Deductions" right={edit && <button className="no-print" onClick={edit.addCost} style={btn('ghost', true)}>+ Add cost</button>}>
          <Table
            cols={[{ l: 'Date', w: '105px' }, { l: 'Description', w: '2fr' }, { l: 'Property', w: '1.3fr' }, { l: 'Receipt', w: '70px' }, { l: 'Amount', w: '120px', right: true }]}
            rows={snap.deductions.map(d => [nice(d.date), d.description, d.property,
              d.receipt_url ? <a key="r" href={d.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>View</a> : '—',
              <span key="a">{money(d.amount)}{edit && d.kind === 'cost' && <button className="no-print" title="Remove" onClick={() => edit.removeCost(d.key)} style={xBtn}>×</button>}</span>])}
            total={['Total', '', '', '', money(s.fee + s.costs)]}
            empty="Nothing deducted this period."
          />
        </Section>

        <Section n={3} title="Payments to you" right={edit && <button className="no-print" onClick={edit.addPayout} style={btn('ghost', true)}>+ Record payment</button>}>
          <Table
            cols={[{ l: 'Date paid', w: '105px' }, { l: 'Description', w: '2fr' }, { l: 'Property', w: '1.3fr' }, { l: 'Receipt', w: '70px' }, { l: 'Amount', w: '120px', right: true }]}
            rows={snap.payouts.map(p => [
              p.paid_date ? nice(p.paid_date) : <span key="d" style={{ color: '#B76E00' }}>Due {nice(p.due_date)}</span>,
              p.description, p.property,
              p.receipt_url ? <a key="r" href={p.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>View</a> : '—',
              <span key="a" style={{ color: p.paid_date ? C.ink : C.faint }}>{money(p.amount)}{edit && <button className="no-print" title="Remove" onClick={() => edit.removePayout(p.key)} style={xBtn}>×</button>}</span>,
            ])}
            total={['Paid', '', '', '', money(s.paidOut)]}
            empty="No payments to you in this period."
          />
        </Section>

        <Section n={4} title="Your properties" right={edit && edit.linkable.length > 0 && (
          <select className="no-print" value="" onChange={e => e.target.value && edit.linkProperty(e.target.value)} style={{ ...input, width: 'auto', padding: '4px 8px', fontSize: 12.5, cursor: 'pointer' }}>
            <option value="">+ Link a property</option>
            {edit.linkable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}>
          {snap.properties.length === 0 ? <div style={{ fontSize: 13, color: C.faint, padding: 10 }}>No properties are linked to this landlord yet.</div> :
            snap.properties.map(p => (
              <div key={p.id} style={{ border: '1px solid ' + C.row, borderRadius: 6, padding: '12px 14px', marginTop: 8, breakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: C.faint }}>{p.address || '—'}</div></div>
                  <Pill width={0} color={p.let ? C.green : C.grey}>{p.let ? 'Let' : 'Vacant'}</Pill>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginTop: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Tenancy</div>
                    {p.tenancies.length === 0 ? <span style={{ color: C.faint }}>No current tenancy</span> : p.tenancies.map((l, i) => <div key={i}>{l.tenant} · {money(l.rent)}/mo{l.end ? ` · ends ${nice(l.end)}` : ''}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Maintenance</div>
                    <div>{p.openCount} open{p.doneCount ? ` · ${p.doneCount} completed this period` : ''}</div>
                    {p.open.map((t, i) => <div key={i} style={{ color: C.muted, fontSize: 12.5 }}>• {t}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Certificates due in 60 days</div>
                    {p.certs.length === 0 ? <span style={{ color: '#00854D' }}>All in date</span> : p.certs.map((c, i) => <div key={i} style={{ color: c.expiry < today ? C.red : '#B76E00' }}>{c.type} — {c.expiry < today ? 'expired' : 'expires'} {nice(c.expiry)}</div>)}
                  </div>
                </div>
              </div>
            ))}
        </Section>

        {(edit || snap.note) && (
          <Section n={5} title="Notes from your property manager">
            {edit
              ? <textarea className="no-print" value={edit.note} onChange={e => edit.setNote(e.target.value)} placeholder="Anything the landlord should know this period, e.g. rent increase agreed, boiler serviced, tenant giving notice…" style={{ ...input, minHeight: 70, resize: 'vertical', fontSize: 13 }} />
              : null}
            {snap.note && <div className={edit ? 'print-only' : undefined} style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 6, display: edit ? 'none' : 'block' }}>{snap.note}</div>}
          </Section>
        )}

        {snap.landlord.bank && <div style={{ marginTop: 22, fontSize: 12, color: C.faint }}>Payments go to {snap.landlord.bank}</div>}
      </div>
    </div>
  )
}

const PRINT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
@media print { body * { visibility: hidden !important } #landlord-statement, #landlord-statement * { visibility: visible !important } #landlord-statement { position: absolute; left: 0; top: 0; width: 100%; border: none !important } .no-print { display: none !important } .print-only { display: block !important } }`

// ---------- Landlord portal: list of statements sent to them ----------

export function LandlordReportsInbox({ mode, landlordId }: { mode: Mode; landlordId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [open, setOpen] = useState<any | null>(null)
  useEffect(() => {
    supabase.from('landlord_statements').select('*').eq('module', mode).eq('landlord_id', landlordId).order('period_to', { ascending: false }).order('sent_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []))
  }, [mode, landlordId])
  async function view(r: any) {
    setOpen(r)
    if (!r.viewed_at) { await supabase.rpc('mark_landlord_statement_viewed', { sid: r.id }) }
  }
  if (!rows) return <div style={{ padding: 30, color: C.faint, fontSize: 14 }}>Loading…</div>
  if (open) return (
    <div style={{ fontFamily: 'Figtree, Inter, sans-serif' }}>
      <style>{PRINT_CSS}</style>
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setOpen(null)} style={btn('ghost', true)}>← All reports</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={btn('gold', true)}>Download PDF</button>
      </div>
      <StatementView snap={open.snapshot} />
    </div>
  )
  return (
    <div style={{ fontFamily: 'Figtree, Inter, sans-serif', background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 120px', padding: '10px 16px', borderBottom: '1px solid ' + C.row, fontSize: 12.5, color: C.muted }}>
        <span>Report</span><span>Sent</span><span style={{ textAlign: 'right' }}>Balance</span><span />
      </div>
      {rows.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: C.faint, fontSize: 14 }}>No reports yet. Your property manager will send your statement here each period.</div> :
        rows.map(r => (
          <div key={r.id} onClick={() => view(r)} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 120px', padding: '12px 16px', borderBottom: '1px solid ' + C.row, alignItems: 'center', cursor: 'pointer', fontSize: 14 }}>
            <span style={{ fontWeight: r.viewed_at ? 400 : 600 }}>{!r.viewed_at && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: C.goldDark, marginRight: 8 }} />}{r.period_label}</span>
            <span style={{ color: C.muted, fontSize: 13 }}>{nice(r.sent_at)}</span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: Number(r.balance) > 0.005 ? '#B76E00' : '#00854D' }}>{Number(r.balance) > 0.005 ? money(Number(r.balance)) + ' to pay' : 'Settled'}</span>
            <span style={{ textAlign: 'right' }}><span style={btn('ghost', true)}>Open</span></span>
          </div>
        ))}
    </div>
  )
}

// ---------- Staff: Landlord Reports ----------

export default function LandlordStatements({ mode }: { mode: Mode }) {
  const t = T[mode]
  const PERIODS = useMemo(periods, [])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState('')
  const [me, setMe] = useState('')
  const [landlords, setLandlords] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [rentRows, setRentRows] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [costs, setCosts] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [periodKey, setPeriodKey] = useState(PERIODS[0].key)
  const [feeDraft, setFeeDraft] = useState<string>('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'cost' | 'payout'>(null)
  const [form, setForm] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [viewSent, setViewSent] = useState<any | null>(null)
  const [flash, setFlash] = useState('')

  useEffect(() => { load() }, [mode])

  async function load(quiet = false) {
    if (!quiet) setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMe(user.email ?? '')
    const uid = await getAccountId(user)
    setAccountId(uid)
    const [ll, props, pays, mj, comp, ch, st] = await Promise.all([
      supabase.from(t.landlords).select('*').eq('user_id', uid).order('name'),
      supabase.from(t.properties).select('*').eq('user_id', uid).order('name'),
      supabase.from(t.payouts).select('*').eq('user_id', uid),
      supabase.from(t.maintenance).select('*').eq('user_id', uid),
      supabase.from(t.compliance).select('*').eq('user_id', uid),
      supabase.from('landlord_charges').select('*').eq('user_id', uid).eq('module', mode),
      supabase.from('landlord_statements').select('id,landlord_id,period_label,period_from,period_to,balance,sent_at,sent_by,emailed_to,viewed_at,snapshot').eq('user_id', uid).eq('module', mode).order('sent_at', { ascending: false }),
    ])
    setLandlords(ll.data ?? [])
    setProperties(props.data ?? [])
    setPayouts(pays.data ?? [])
    setJobs(mj.data ?? [])
    setCompliance(comp.data ?? [])
    setCosts(ch.data ?? [])
    setSent(st.data ?? [])

    if (mode === 'pm') {
      const [rp, ls, tn, un] = await Promise.all([
        supabase.from('pm_rent_payments').select('*').eq('user_id', uid),
        supabase.from('pm_leases').select('*').eq('user_id', uid),
        supabase.from('pm_tenants').select('id,name,property_id,unit_id').eq('user_id', uid),
        supabase.from('pm_units').select('id,property_id').eq('user_id', uid),
      ])
      const tenant = (id: string) => (tn.data ?? []).find((x: any) => x.id === id)
      const unitProp = (id: string) => (un.data ?? []).find((x: any) => x.id === id)?.property_id
      setRentRows((rp.data ?? []).filter((r: any) => !/deposit/i.test(r.category ?? '')).map((r: any) => {
        const paid = String(r.status ?? '').toLowerCase() === 'paid'
        const due = r.due_date ?? r.paid_date ?? r.created_at?.slice(0, 10)
        return {
          key: 'pm:' + r.id, id: r.id,
          property_id: r.property_id ?? unitProp(r.unit_id) ?? tenant(r.tenant_id)?.property_id,
          tenant: tenant(r.tenant_id)?.name ?? '—', due_date: due,
          paid_date: r.paid_date ?? (paid ? due : null), amount: Number(r.amount) || 0,
        }
      }))
      setLeases((ls.data ?? []).map((l: any) => ({ property_id: l.property_id ?? unitProp(l.unit_id), tenant: tenant(l.tenant_id)?.name ?? '—', start: l.start_date, end: l.end_date, rent: Number(l.monthly_rent) || 0 })))
    } else {
      const [tc, tn, rr] = await Promise.all([
        supabase.from('estate_tenancies').select('*').eq('user_id', uid),
        supabase.from('estate_tenants').select('id,name').eq('user_id', uid),
        supabase.from('estate_rent_receipts').select('*').eq('user_id', uid),
      ])
      const tname = (id: string) => (tn.data ?? []).find((x: any) => x.id === id)?.name ?? '—'
      const tenancies = tc.data ?? []
      setLeases(tenancies.map((l: any) => ({ property_id: l.property_id, tenant: tname(l.tenant_id), start: l.start_date, end: l.end_date, rent: Number(l.rent) || 0 })))
      // Estate Agency tenancies carry a monthly rent; each month becomes one
      // expected line, and ticking it records the receipt.
      const rows: any[] = []
      const now = new Date()
      tenancies.forEach((l: any) => {
        if (!l.start_date) return
        const start = new Date(l.start_date + 'T00:00:00')
        const end = l.end_date ? new Date(l.end_date + 'T00:00:00') : now
        for (let d = new Date(start); d <= end && d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(start.getDate(), 28))) {
          const due = iso(d)
          const got = (rr.data ?? []).find((x: any) => x.tenancy_id === l.id && x.due_date === due)
          rows.push({ key: 'ea:' + l.id + ':' + due, tenancy_id: l.id, receipt_id: got?.id, property_id: l.property_id, tenant: tname(l.tenant_id), due_date: due, paid_date: got?.paid_date ?? null, amount: Number(got?.amount ?? l.rent) || 0 })
        }
      })
      setRentRows(rows)
    }
    setLoading(false)
  }

  const period = PERIODS.find(p => p.key === periodKey)!
  const today = iso(new Date())
  const propName = (id: string) => properties.find(p => p.id === id)?.name ?? '—'
  const feeOf = (l: any) => Number(l?.[t.feeCol] ?? 10)

  function build(l: any, withNote = ''): Snapshot {
    const props = properties.filter(p => p.owner_id === l.id)
    const pids = new Set(props.map(p => p.id))
    const rent = rentRows.filter(r => pids.has(r.property_id) && inRange(r.due_date, period)).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    const due = rent.reduce((s, r) => s + r.amount, 0)
    const received = rent.filter(r => r.paid_date).reduce((s, r) => s + r.amount, 0)
    const pct = feeOf(l)
    const fee = Math.round(received * pct) / 100
    const cs = costs.filter(c => c.landlord_id === l.id && inRange(c.date, period)).sort((a, b) => a.date.localeCompare(b.date))
    const costTotal = cs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
    const lp = payouts.filter(p => p.landlord_id === l.id && inRange(p.paid_date ?? p.due_date, period)).sort((a, b) => (a.paid_date ?? a.due_date ?? '').localeCompare(b.paid_date ?? b.due_date ?? ''))
    const paidOut = lp.filter(p => p.paid_date).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const net = received - fee - costTotal
    const soon = new Date(); soon.setDate(soon.getDate() + 60)
    return {
      landlord: { name: l.name, address: l.address || undefined, bank: (l.bank_name || l.account_number) ? [l.account_name || l.name, l.bank_name, l.sort_code, l.account_number ? '****' + String(l.account_number).slice(-4) : ''].filter(Boolean).join(' · ') : undefined },
      business: 'Sangsters',
      period: { label: period.label, from: period.from, to: period.to },
      issued: today,
      summary: { due, received, arrears: due - received, pct, fee, costs: costTotal, net, paidOut, balance: net - paidOut },
      rent: rent.map(r => ({ key: r.key, property: propName(r.property_id), tenant: r.tenant, due_date: r.due_date, amount: r.amount, paid_date: r.paid_date })),
      deductions: [
        ...(fee > 0 ? [{ key: 'fee', date: period.to, description: `Management fee — ${pct}% of ${money(received)} received`, property: props.length === 1 ? props[0].name : 'All properties', amount: fee, kind: 'fee' as const }] : []),
        ...cs.map(c => ({ key: c.id, date: c.date, description: [c.category, c.description].filter(Boolean).join(' — '), property: c.property_id ? propName(c.property_id) : 'All properties', receipt_url: c.receipt_url, amount: Number(c.amount) || 0, kind: 'cost' as const })),
      ],
      payouts: lp.map(p => ({ key: p.id, paid_date: p.paid_date, due_date: p.due_date, description: [p.category, p.notes].filter(Boolean).join(' — ') || 'Payment', property: p.property_id ? propName(p.property_id) : '—', receipt_url: p.receipt_url, amount: Number(p.amount) || 0 })),
      properties: props.map(p => {
        const ls = leases.filter(x => x.property_id === p.id && (!x.end || x.end >= period.from) && (!x.start || x.start <= period.to))
        const open = jobs.filter(j => j.property_id === p.id && !isDoneJob(j.status))
        return {
          id: p.id, name: p.name, address: [p.address, p.city].filter(Boolean).join(', '), let: ls.length > 0,
          tenancies: ls.map(x => ({ tenant: x.tenant, rent: x.rent, end: x.end ?? null })),
          open: open.slice(0, 4).map(j => j.title), openCount: open.length,
          doneCount: jobs.filter(j => j.property_id === p.id && isDoneJob(j.status) && inRange(j.updated_at ?? j.created_at, period)).length,
          certs: compliance.filter(c => c.property_id === p.id && c.expiry_date && c.expiry_date <= iso(soon)).map(c => ({ type: c.type, expiry: c.expiry_date })),
        }
      }),
      note: withNote,
    }
  }

  const current = landlords.find(l => l.id === selected) ?? null
  const snap = current ? build(current, note) : null
  const sentFor = (lid: string) => sent.filter(s => s.landlord_id === lid)
  const sentThisPeriod = (lid: string) => sent.find(s => s.landlord_id === lid && s.period_from === period.from && s.period_to === period.to)

  useEffect(() => { setFeeDraft(current ? String(feeOf(current)) : '') }, [selected, landlords])

  // ---- actions ----
  async function saveFee() {
    if (!current) return
    const v = parseFloat(feeDraft)
    if (isNaN(v) || v === feeOf(current)) return
    const { error } = await supabase.from(t.landlords).update({ [t.feeCol]: v }).eq('id', current.id)
    if (error) { alert(error.message); return }
    setLandlords(ls => ls.map(l => l.id === current.id ? { ...l, [t.feeCol]: v } : l))
  }

  async function toggleRent(key: string) {
    const r = rentRows.find(x => x.key === key)
    if (!r) return
    const nowPaid = !r.paid_date
    const paidDate = nowPaid ? (r.due_date <= today ? r.due_date : today) : null
    setRentRows(rows => rows.map(x => x.key === key ? { ...x, paid_date: paidDate } : x))
    let error: any = null
    if (mode === 'pm') {
      ({ error } = await supabase.from('pm_rent_payments').update({ paid_date: paidDate, status: nowPaid ? 'paid' : 'pending' }).eq('id', r.id))
    } else if (nowPaid) {
      const res = await supabase.from('estate_rent_receipts').upsert({ user_id: accountId, tenancy_id: r.tenancy_id, property_id: r.property_id, due_date: r.due_date, amount: r.amount, paid_date: paidDate }, { onConflict: 'tenancy_id,due_date' }).select('id').single()
      error = res.error
      if (res.data) setRentRows(rows => rows.map(x => x.key === key ? { ...x, receipt_id: res.data.id } : x))
    } else {
      ({ error } = await supabase.from('estate_rent_receipts').delete().eq('tenancy_id', r.tenancy_id).eq('due_date', r.due_date))
    }
    if (error) { alert(error.message); load(true) }
  }

  async function linkProperty(pid: string) {
    if (!current) return
    const { error } = await supabase.from(t.properties).update({ owner_id: current.id }).eq('id', pid)
    if (error) { alert(error.message); return }
    setProperties(ps => ps.map(p => p.id === pid ? { ...p, owner_id: current.id } : p))
  }

  async function saveModal() {
    if (!current) return
    const amount = parseFloat(form.amount)
    if (!amount) { alert('Enter an amount.'); return }
    setBusy(true)
    let error: any
    if (modal === 'cost') {
      ({ error } = await supabase.from('landlord_charges').insert({ user_id: accountId, module: mode, landlord_id: current.id, property_id: form.property_id || null, date: form.date || today, category: form.category || 'Repair', description: form.description || null, amount, receipt_url: form.receipt_url || null }))
    } else {
      ({ error } = await supabase.from(t.payouts).insert({ user_id: accountId, landlord_id: current.id, property_id: form.property_id || null, category: form.category || 'Rent Share', amount, due_date: form.due_date || form.paid_date || today, paid_date: form.paid_date || null, notes: form.notes || null, receipt_url: form.receipt_url || null }))
    }
    setBusy(false)
    if (error) { alert(error.message); return }
    setModal(null); setForm({})
    load(true)
  }

  async function removeCost(id: string) {
    if (!confirm('Remove this cost from the statement?')) return
    await supabase.from('landlord_charges').delete().eq('id', id)
    setCosts(cs => cs.filter(c => c.id !== id))
  }
  async function removePayout(id: string) {
    if (!confirm('Delete this payment record?')) return
    await supabase.from(t.payouts).delete().eq('id', id)
    setPayouts(ps => ps.filter(p => p.id !== id))
  }

  async function send() {
    if (!current || !snap) return
    const already = sentThisPeriod(current.id)
    const to = current.email
    const msg = `${already ? 'A statement for this period was already sent on ' + nice(already.sent_at) + '. Send an updated one?\n\n' : ''}Send the ${period.label} statement to ${current.name}?\n\nIt will appear in their landlord portal${to ? ' and be emailed to ' + to : ' (no email on file, so portal only)'}.`
    if (!confirm(msg)) return
    setBusy(true)
    const { data: row, error } = await supabase.from('landlord_statements').insert({
      user_id: accountId, module: mode, landlord_id: current.id, period_label: period.label, period_from: period.from, period_to: period.to,
      balance: Math.round(snap.summary.balance * 100) / 100, snapshot: snap, note: note || null, sent_by: me,
    }).select('id').single()
    if (error || !row) { setBusy(false); alert(error?.message ?? 'Could not save the statement'); return }
    let emailed = false
    if (to) {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/landlord-statement-send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ id: row.id }) })
      const d = await res.json().catch(() => ({}))
      emailed = res.ok && !!d.emailed
    }
    setBusy(false)
    setFlash(emailed ? `Sent to ${current.name} — in their portal and emailed to ${to}.` : `Saved to ${current.name}'s portal.${to ? ' The email could not be sent right now.' : ' Add an email address to their landlord record to email them too.'}`)
    setTimeout(() => setFlash(''), 7000)
    load(true)
  }

  if (loading) return <div style={{ padding: 40, color: C.faint, fontSize: 14 }}>Loading landlord reports…</div>

  const list = landlords.filter(l => !search || l.name?.toLowerCase().includes(search.toLowerCase()))
  const currentProps = current ? properties.filter(p => p.owner_id === current.id) : []

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: C.ink }}>
      <style>{PRINT_CSS}</style>

      {/* Landlord list */}
      <div className="no-print" style={{ width: 270, flexShrink: 0, border: '1px solid ' + C.row, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid ' + C.row }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Period</div>
          <select value={periodKey} onChange={e => { setPeriodKey(e.target.value); setViewSent(null) }} style={{ ...input, fontSize: 13, cursor: 'pointer' }}>
            <optgroup label="Month">{PERIODS.filter(p => p.key[0] === 'm').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
            <optgroup label="Quarter">{PERIODS.filter(p => p.key[0] === 'q').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
            <optgroup label="Year">{PERIODS.filter(p => p.key === 'ytd').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search landlords" style={{ ...input, fontSize: 13, marginTop: 8 }} />
        </div>
        <div style={{ maxHeight: 620, overflowY: 'auto' }}>
          {list.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.faint }}>No landlords yet.</div>}
          {list.map(l => {
            const b = build(l).summary
            const nProps = properties.filter(p => p.owner_id === l.id).length
            const on = l.id === selected
            const sp = sentThisPeriod(l.id)
            const state = nProps === 0 ? { l: 'No property', c: C.grey } : b.due === 0 && b.paidOut === 0 ? { l: 'Nothing due', c: C.grey } : b.balance > 0.005 ? { l: 'Owed ' + money(b.balance).replace('.00', ''), c: C.orange } : b.arrears > 0.005 ? { l: 'Rent arrears', c: C.red } : { l: 'Settled', c: C.green }
            return (
              <div key={l.id} onClick={() => { setSelected(l.id); setNote(''); setViewSent(null) }} style={{ padding: '10px 12px', borderBottom: '1px solid ' + C.row, cursor: 'pointer', background: on ? C.cream : '#fff', borderLeft: '3px solid ' + (on ? C.goldDark : 'transparent') }}>
                <div style={{ fontSize: 14, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.faint }}>{sp ? (sp.viewed_at ? '✓ Sent · viewed' : '✓ Sent') : `${nProps} ${nProps === 1 ? 'property' : 'properties'}`}</span>
                  <span style={{ fontSize: 11.5, color: '#fff', background: state.c, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>{state.l}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Statement */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!current || !snap ? (
          <div style={{ border: '1px dashed ' + C.border, borderRadius: 8, padding: '70px 20px', textAlign: 'center', color: C.muted, fontSize: 14, background: '#fff' }}>
            Pick a landlord on the left to see their statement for <b>{period.label}</b>.
          </div>
        ) : viewSent ? (
          <>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setViewSent(null)} style={btn('ghost', true)}>← Back to live statement</button>
              <span style={{ fontSize: 13, color: C.muted }}>Copy sent {nice(viewSent.sent_at)}{viewSent.sent_by ? ` by ${viewSent.sent_by}` : ''}{viewSent.viewed_at ? ` · viewed ${nice(viewSent.viewed_at)}` : ' · not opened yet'}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => window.print()} style={btn('ghost', true)}>Download PDF</button>
            </div>
            <StatementView snap={viewSent.snapshot} />
          </>
        ) : (
          <>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Management fee</span>
              <input type="number" value={feeDraft} onChange={e => setFeeDraft(e.target.value)} onBlur={saveFee} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ ...input, width: 70, padding: '5px 8px', fontSize: 13 }} />
              <span style={{ fontSize: 13, color: C.muted }}>% of rent received · saved to this landlord</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => window.print()} style={btn('ghost', true)}>Download PDF</button>
              <button onClick={send} disabled={busy} style={{ ...btn('gold', true), opacity: busy ? 0.6 : 1 }}>{busy ? 'Sending…' : sentThisPeriod(current.id) ? 'Send updated copy' : 'Send to landlord'}</button>
            </div>
            {flash && <div className="no-print" style={{ background: '#E6F9F0', border: '1px solid #A6E9C9', color: '#00854D', borderRadius: 6, padding: '9px 14px', fontSize: 13, marginBottom: 12 }}>{flash}</div>}

            <StatementView snap={snap} edit={{
              toggleRent,
              addCost: () => { setForm({ date: today, category: 'Repair', property_id: currentProps.length === 1 ? currentProps[0].id : '' }); setModal('cost') },
              removeCost,
              addPayout: () => { setForm({ paid_date: today, category: 'Rent Share', property_id: currentProps.length === 1 ? currentProps[0].id : '', amount: snap.summary.balance > 0 ? snap.summary.balance.toFixed(2) : '' }); setModal('payout') },
              removePayout,
              linkable: properties.filter(p => !p.owner_id).map(p => ({ id: p.id, name: p.name })),
              linkProperty,
              note, setNote,
            }} />

            {sentFor(current.id).length > 0 && (
              <div className="no-print" style={{ marginTop: 20, border: '1px solid ' + C.row, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + C.row, fontSize: 14, fontWeight: 600 }}>Sent to {current.name}</div>
                {sentFor(current.id).map(r => (
                  <div key={r.id} onClick={() => setViewSent(r)} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 110px', padding: '10px 16px', borderBottom: '1px solid ' + C.row, fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{r.period_label}</span>
                    <span style={{ color: C.muted }}>Sent {nice(r.sent_at)}{r.emailed_to ? ' · emailed' : ''}</span>
                    <span style={{ color: Number(r.balance) > 0.005 ? '#B76E00' : '#00854D' }}>{Number(r.balance) > 0.005 ? money(Number(r.balance)) + ' owed' : 'Settled'}</span>
                    <span style={{ textAlign: 'right' }}><Pill width={0} color={r.viewed_at ? C.green : C.grey}>{r.viewed_at ? 'Viewed' : 'Not opened'}</Pill></span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modal && current && (
        <Modal title={modal === 'cost' ? `Add a cost for ${current.name}` : `Record a payment to ${current.name}`} onClose={() => { setModal(null); setForm({}) }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{modal === 'cost' ? 'Money we spent on the landlord’s behalf. It’s deducted on their statement.' : 'Money we paid out to the landlord. It shows under “Payments to you”.'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Category</label>
              <select style={{ ...input, cursor: 'pointer' }} value={form.category ?? ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {(modal === 'cost' ? COST_CATEGORIES : PAYOUT_CATEGORIES).map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label style={label}>Amount (£) *</label><input type="number" style={input} value={form.amount ?? ''} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
            <div><label style={label}>Property</label>
              <select style={{ ...input, cursor: 'pointer' }} value={form.property_id ?? ''} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                <option value="">{modal === 'cost' ? 'All properties' : '—'}</option>
                {currentProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            {modal === 'cost'
              ? <div><label style={label}>Date</label><input type="date" style={input} value={form.date ?? ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              : <div><label style={label}>Date paid (blank if not paid yet)</label><input type="date" style={input} value={form.paid_date ?? ''} onChange={e => setForm({ ...form, paid_date: e.target.value })} /></div>}
            {modal === 'payout' && !form.paid_date && <div><label style={label}>Due date</label><input type="date" style={input} value={form.due_date ?? ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>}
            <div style={{ gridColumn: '1 / -1' }}><label style={label}>{modal === 'cost' ? 'What was it?' : 'Note / reference'}</label>
              <input style={input} value={(modal === 'cost' ? form.description : form.notes) ?? ''} onChange={e => setForm({ ...form, [modal === 'cost' ? 'description' : 'notes']: e.target.value })} placeholder={modal === 'cost' ? 'e.g. Plumber — fixed kitchen leak' : 'e.g. Bank transfer ref SG-0925'} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={label}>Receipt (photo or PDF)</label>
              {form.receipt_url ? <div style={{ fontSize: 13 }}><a href={form.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>Receipt attached</a> <button onClick={() => setForm({ ...form, receipt_url: '' })} style={xBtn}>×</button></div>
                : <input type="file" accept="image/*,application/pdf" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); const u = await uploadReceipt(f); setBusy(false); if (u) setForm((x: any) => ({ ...x, receipt_url: u })) }} style={{ fontSize: 13 }} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => { setModal(null); setForm({}) }} style={btn('ghost')}>Cancel</button>
            <button onClick={saveModal} disabled={busy} style={{ ...btn('gold'), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
