'use client'
// Landlord Reports: one clear statement per landlord per period, built from
// the records staff already keep (rent, payouts, charges, leases, repairs,
// compliance). Used by Property Management (mode 'pm') and Estate Agency
// (mode 'ea'). The statement area prints cleanly to PDF.
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { C, Pill, btn, input } from '../crm/Page'

type Mode = 'pm' | 'ea'
type Period = { key: string; label: string; from: string; to: string }

const T = {
  pm: { landlords: 'pm_landlords', properties: 'pm_properties', payouts: 'pm_landlord_payments', maintenance: 'pm_maintenance', compliance: 'pm_compliance' },
  ea: { landlords: 'estate_landlords', properties: 'estate_properties', payouts: 'estate_landlord_payments', maintenance: 'estate_maintenance', compliance: 'estate_compliance' },
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const money = (n: number) => (n < 0 ? '-£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nice = (d?: string | null) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const inRange = (d: string | null | undefined, p: Period) => !!d && d.slice(0, 10) >= p.from && d.slice(0, 10) <= p.to

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
    out.push({ key: 'q' + iso(a), label: `Q${Math.floor(a.getMonth() / 3) + 1} ${a.getFullYear()} (${a.toLocaleDateString('en-GB', { month: 'short' })}–${b.toLocaleDateString('en-GB', { month: 'short' })})`, from: iso(a), to: iso(b) })
  }
  out.push({ key: 'ytd', label: `Year to date ${now.getFullYear()}`, from: `${now.getFullYear()}-01-01`, to: iso(now) })
  return out
}

function Section({ n, title, right, children }: { n: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26, breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '2px solid ' + C.gold, paddingBottom: 6, marginBottom: 8 }}>
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
  const cell = (right?: boolean): React.CSSProperties => ({ padding: '8px 10px', fontSize: 13, textAlign: right ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: right ? 'flex-end' : 'flex-start', minWidth: 0 })
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid ' + C.row }}>
        {cols.map(c => <div key={c.l} style={{ ...cell(c.right), fontSize: 12, color: C.muted, fontWeight: 500 }}>{c.l}</div>)}
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
  )
}

export default function LandlordStatements({ mode }: { mode: Mode }) {
  const t = T[mode]
  const PERIODS = useMemo(periods, [])
  const [loading, setLoading] = useState(true)
  const business = { name: 'Sangsters' }
  const [landlords, setLandlords] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [rentRows, setRentRows] = useState<any[]>([]) // normalised: {property_id, tenant, due_date, paid_date, amount, status}
  const [payouts, setPayouts] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([]) // normalised: {property_id, tenant, start, end, rent, status}
  const [jobs, setJobs] = useState<any[]>([])
  const [compliance, setCompliance] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [periodKey, setPeriodKey] = useState(PERIODS[0].key)
  const [feePct, setFeePct] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [mode])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const [ll, props, pays, mj, comp] = await Promise.all([
      supabase.from(t.landlords).select('*').eq('user_id', uid).order('name'),
      supabase.from(t.properties).select('*').eq('user_id', uid).order('name'),
      supabase.from(t.payouts).select('*').eq('user_id', uid),
      supabase.from(t.maintenance).select('*').eq('user_id', uid),
      supabase.from(t.compliance).select('*').eq('user_id', uid),
    ])
    setLandlords(ll.data ?? [])
    setProperties(props.data ?? [])
    setPayouts(pays.data ?? [])
    setJobs(mj.data ?? [])
    setCompliance(comp.data ?? [])
    const fees: Record<string, number> = {}
    ;(ll.data ?? []).forEach((l: any) => { fees[l.id] = l.commission_rate ?? l.management_fee_pct ?? 10 })
    setFeePct(fees)

    if (mode === 'pm') {
      const [rp, ls, tn, un] = await Promise.all([
        supabase.from('pm_rent_payments').select('*').eq('user_id', uid),
        supabase.from('pm_leases').select('*').eq('user_id', uid),
        supabase.from('pm_tenants').select('id,name,property_id,unit_id').eq('user_id', uid),
        supabase.from('pm_units').select('id,property_id,unit_number').eq('user_id', uid),
      ])
      const tenant = (id: string) => (tn.data ?? []).find((x: any) => x.id === id)
      const unitProp = (id: string) => (un.data ?? []).find((x: any) => x.id === id)?.property_id
      setRentRows((rp.data ?? []).filter((r: any) => (r.category ?? 'Rent') !== 'Deposit').map((r: any) => ({
        property_id: r.property_id ?? unitProp(r.unit_id) ?? tenant(r.tenant_id)?.property_id,
        tenant: tenant(r.tenant_id)?.name ?? '—',
        due_date: r.due_date ?? r.paid_date ?? r.created_at?.slice(0, 10),
        paid_date: r.paid_date ?? (String(r.status).toLowerCase() === 'paid' ? (r.due_date ?? r.created_at?.slice(0, 10)) : null),
        amount: Number(r.amount) || 0,
        status: String(r.status ?? '').toLowerCase(),
      })))
      setLeases((ls.data ?? []).map((l: any) => ({ property_id: l.property_id ?? unitProp(l.unit_id), tenant: tenant(l.tenant_id)?.name ?? '—', start: l.start_date, end: l.end_date, rent: Number(l.monthly_rent) || 0, status: l.status })))
    } else {
      const [tc, tn, rs] = await Promise.all([
        supabase.from('estate_tenancies').select('*').eq('user_id', uid),
        supabase.from('estate_tenants').select('id,name').eq('user_id', uid),
        supabase.from('estate_rent_schedules').select('*').eq('user_id', uid),
      ])
      const tname = (id: string) => (tn.data ?? []).find((x: any) => x.id === id)?.name ?? '—'
      const tenancies = tc.data ?? []
      setLeases(tenancies.map((l: any) => ({ property_id: l.property_id, tenant: tname(l.tenant_id), start: l.start_date, end: l.end_date, rent: Number(l.rent) || 0, status: l.status })))
      // Estate Agency keeps a rent schedule per tenancy rather than a row per
      // payment, so each month of an active tenancy becomes one expected line.
      const rows: any[] = []
      tenancies.forEach((l: any) => {
        const sch = (rs.data ?? []).find((s: any) => s.tenancy_id === l.id)
        const start = new Date((l.start_date ?? iso(new Date())) + 'T00:00:00')
        const end = l.end_date ? new Date(l.end_date + 'T00:00:00') : new Date()
        const day = Math.min(28, parseInt(sch?.due_day ?? '') || start.getDate())
        for (let d = new Date(start.getFullYear(), start.getMonth(), day); d <= end && d <= new Date(); d = new Date(d.getFullYear(), d.getMonth() + 1, day)) {
          rows.push({ property_id: l.property_id, tenant: tname(l.tenant_id), due_date: iso(d), paid_date: String(sch?.status ?? '').toLowerCase() === 'paid' ? iso(d) : null, amount: Number(sch?.amount ?? l.rent) || 0, status: String(sch?.status ?? 'pending').toLowerCase() })
        }
      })
      setRentRows(rows)
    }
    setLoading(false)
  }

  const period = PERIODS.find(p => p.key === periodKey)!
  const today = iso(new Date())
  const propsOf = (lid: string) => properties.filter(p => p.owner_id === lid)

  function build(lid: string) {
    const props = propsOf(lid)
    const pids = new Set(props.map(p => p.id))
    const rent = rentRows.filter(r => pids.has(r.property_id) && inRange(r.due_date, period)).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    const due = rent.reduce((s, r) => s + r.amount, 0)
    const received = rent.filter(r => r.paid_date).reduce((s, r) => s + r.amount, 0)
    const pct = feePct[lid] ?? 10
    const fee = Math.round(received * pct) / 100
    const lp = payouts.filter(p => p.landlord_id === lid && inRange(p.paid_date ?? p.due_date, period))
    const charges: any[] = [] // costs charged to the landlord get their own records in the full build
    const paidOut = lp.filter(p => p.paid_date && !charges.includes(p)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const pending = lp.filter(p => !p.paid_date && !charges.includes(p))
    const chargeTotal = charges.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const net = received - fee - chargeTotal
    const balance = net - paidOut
    return { props, rent, due, received, arrears: due - received, pct, fee, charges, chargeTotal, net, lp, paidOut, pending, balance }
  }

  const list = landlords.filter(l => !search || l.name?.toLowerCase().includes(search.toLowerCase()))
  const current = landlords.find(l => l.id === selected) ?? null
  const s = current ? build(current.id) : null

  if (loading) return <div style={{ padding: 40, color: C.faint, fontSize: 14 }}>Loading landlord reports…</div>

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
        @media print { body * { visibility: hidden !important } #landlord-statement, #landlord-statement * { visibility: visible !important } #landlord-statement { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important } .no-print { display: none !important } }`}</style>

      {/* Landlord list */}
      <div className="no-print" style={{ width: 270, flexShrink: 0, border: '1px solid ' + C.row, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid ' + C.row }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Period</div>
          <select value={periodKey} onChange={e => setPeriodKey(e.target.value)} style={{ ...input, fontSize: 13, cursor: 'pointer' }}>
            <optgroup label="Month">{PERIODS.filter(p => p.key[0] === 'm').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
            <optgroup label="Quarter">{PERIODS.filter(p => p.key[0] === 'q').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
            <optgroup label="Year">{PERIODS.filter(p => p.key === 'ytd').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search landlords" style={{ ...input, fontSize: 13, marginTop: 8 }} />
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {list.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.faint }}>No landlords yet.</div>}
          {list.map(l => {
            const b = build(l.id)
            const on = l.id === selected
            const state = b.props.length === 0 ? { l: 'No property', c: C.grey } : b.rent.length === 0 ? { l: 'No rent due', c: C.grey } : b.balance > 0.005 ? { l: 'To pay ' + money(b.balance).replace('.00', ''), c: C.orange } : b.arrears > 0.005 ? { l: 'Arrears', c: C.red } : { l: 'Settled', c: C.green }
            return (
              <div key={l.id} onClick={() => { setSelected(l.id); setNote('') }} style={{ padding: '10px 12px', borderBottom: '1px solid ' + C.row, cursor: 'pointer', background: on ? C.cream : '#fff', borderLeft: '3px solid ' + (on ? C.goldDark : 'transparent') }}>
                <div style={{ fontSize: 14, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.faint }}>{b.props.length} {b.props.length === 1 ? 'property' : 'properties'}</span>
                  <span style={{ fontSize: 11.5, color: '#fff', background: state.c, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>{state.l}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Statement */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!current || !s ? (
          <div style={{ border: '1px dashed ' + C.border, borderRadius: 8, padding: '70px 20px', textAlign: 'center', color: C.muted, fontSize: 14, background: '#fff' }}>
            Pick a landlord on the left to see their statement for <b>{period.label}</b>.
          </div>
        ) : (
          <>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Management fee</span>
              <input type="number" value={s.pct} onChange={e => setFeePct({ ...feePct, [current.id]: parseFloat(e.target.value) || 0 })} style={{ ...input, width: 70, padding: '5px 8px', fontSize: 13 }} />
              <span style={{ fontSize: 13, color: C.muted }}>% of rent received</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => window.print()} style={btn('ghost', true)}>Download PDF</button>
              <button onClick={() => alert('Preview only — sending isn\'t switched on yet.')} style={btn('gold', true)}>Send to landlord</button>
            </div>

            <div id="landlord-statement" style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#FBF4E6,#F3E6C8)', borderBottom: '1px solid ' + C.creamLine, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.goldDark, letterSpacing: '0.06em' }}>LANDLORD STATEMENT</div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: C.brown, marginTop: 4 }}>{current.name}</div>
                  {current.address && <div style={{ fontSize: 13, color: '#8A7248', marginTop: 2 }}>{current.address}</div>}
                </div>
                <div style={{ fontSize: 13, color: '#8A7248', textAlign: 'right', lineHeight: 1.7 }}>
                  <div><b style={{ color: C.brown }}>Period:</b> {nice(period.from)} – {nice(period.to)}</div>
                  <div><b style={{ color: C.brown }}>Issued:</b> {nice(today)}</div>
                  <div><b style={{ color: C.brown }}>From:</b> {business.name}</div>
                </div>
              </div>

              <div style={{ padding: '22px 28px 28px' }}>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10 }}>
                  {[
                    { l: 'Rent due', v: money(s.due) },
                    { l: 'Rent received', v: money(s.received), c: C.green },
                    { l: `Our fee (${s.pct}%)`, v: '-' + money(s.fee), c: C.muted },
                    { l: 'Costs charged', v: '-' + money(s.chargeTotal), c: C.muted },
                    { l: 'Paid to you', v: money(s.paidOut) },
                  ].map(x => (
                    <div key={x.l} style={{ border: '1px solid ' + C.row, borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12, color: C.muted }}>{x.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: x.c ?? C.ink, marginTop: 2 }}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 6, background: s.balance > 0.005 ? '#FFF4E0' : '#E6F9F0', border: '1px solid ' + (s.balance > 0.005 ? '#F8D49B' : '#A6E9C9') }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.balance > 0.005 ? 'Balance still to be paid to you' : s.balance < -0.005 ? 'Paid to you in advance' : 'Fully paid for this period'}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Rent received {money(s.received)} − fee {money(s.fee)} − costs {money(s.chargeTotal)} = {money(s.net)} due to you · {money(s.paidOut)} already paid</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.balance > 0.005 ? '#B76E00' : '#00854D', whiteSpace: 'nowrap' }}>{money(Math.abs(s.balance))}</div>
                </div>

                <Section n={1} title="Rent" right={s.arrears > 0.005 ? <Pill color={C.red} width={0}>{money(s.arrears)} unpaid</Pill> : undefined}>
                  <Table
                    cols={[{ l: 'Property', w: '1.3fr' }, { l: 'Tenant', w: '1.2fr' }, { l: 'Due', w: '110px' }, { l: 'Amount', w: '110px', right: true }, { l: 'Received', w: '110px' }, { l: 'Status', w: '120px' }]}
                    rows={s.rent.map(r => {
                      const late = !r.paid_date && r.due_date < today
                      return [
                        properties.find(p => p.id === r.property_id)?.name ?? '—', r.tenant, nice(r.due_date), money(r.amount), r.paid_date ? nice(r.paid_date) : '—',
                        <Pill key="s" width={100} color={r.paid_date ? C.green : late ? C.red : C.orange}>{r.paid_date ? 'Paid' : late ? 'Overdue' : 'Due'}</Pill>,
                      ]
                    })}
                    total={['Total', '', '', money(s.due), money(s.received), '']}
                    empty="No rent was due in this period."
                  />
                </Section>

                <Section n={2} title="Deductions">
                  <Table
                    cols={[{ l: 'Date', w: '110px' }, { l: 'Description', w: '2fr' }, { l: 'Property', w: '1.3fr' }, { l: 'Receipt', w: '90px' }, { l: 'Amount', w: '110px', right: true }]}
                    rows={[
                      ...(s.fee > 0 ? [[nice(period.to), `Management fee — ${s.pct}% of ${money(s.received)} received`, s.props.length === 1 ? s.props[0].name : 'All properties', '—', money(s.fee)]] : []),
                      ...s.charges.map(c => [nice(c.paid_date ?? c.due_date), [c.category, c.notes].filter(Boolean).join(' — '), properties.find(p => p.id === c.property_id)?.name ?? '—', c.receipt_url ? <a key="r" href={c.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>View</a> : '—', money(Number(c.amount) || 0)]),
                    ]}
                    total={['Total', '', '', '', money(s.fee + s.chargeTotal)]}
                    empty="Nothing deducted this period."
                  />
                </Section>

                <Section n={3} title="Payments to you">
                  <Table
                    cols={[{ l: 'Date paid', w: '110px' }, { l: 'Description', w: '2fr' }, { l: 'Property', w: '1.3fr' }, { l: 'Receipt', w: '90px' }, { l: 'Amount', w: '110px', right: true }]}
                    rows={s.lp.filter(p => !s.charges.includes(p)).map(p => [
                      p.paid_date ? nice(p.paid_date) : <span key="d" style={{ color: C.orange }}>Due {nice(p.due_date)}</span>,
                      [p.category, p.notes].filter(Boolean).join(' — ') || 'Payment',
                      properties.find(x => x.id === p.property_id)?.name ?? '—',
                      p.receipt_url ? <a key="r" href={p.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>View</a> : '—',
                      money(Number(p.amount) || 0),
                    ])}
                    total={['Paid', '', '', '', money(s.paidOut)]}
                    empty="No payments to you recorded in this period."
                  />
                </Section>

                <Section n={4} title="Your properties">
                  {s.props.length === 0 ? <div style={{ fontSize: 13, color: C.faint, padding: '10px' }}>No properties are linked to this landlord yet.</div> :
                    s.props.map(p => {
                      const ls = leases.filter(l => l.property_id === p.id && (!l.end || l.end >= period.from))
                      const open = jobs.filter(j => j.property_id === p.id && !/complete|closed|done|resolved/i.test(j.status ?? ''))
                      const doneJobs = jobs.filter(j => j.property_id === p.id && /complete|closed|done|resolved/i.test(j.status ?? '') && inRange(j.updated_at ?? j.created_at, period))
                      const soon = new Date(); soon.setDate(soon.getDate() + 60)
                      const certs = compliance.filter(c => c.property_id === p.id && c.expiry_date && c.expiry_date <= iso(soon))
                      return (
                        <div key={p.id} style={{ border: '1px solid ' + C.row, borderRadius: 6, padding: '12px 14px', marginTop: 8, breakInside: 'avoid' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: C.faint }}>{[p.address, p.city].filter(Boolean).join(', ') || '—'}</div></div>
                            <Pill width={0} color={ls.length ? C.green : C.grey}>{ls.length ? 'Let' : 'Vacant'}</Pill>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: 10, fontSize: 13 }}>
                            <div>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Tenancy</div>
                              {ls.length === 0 ? <span style={{ color: C.faint }}>No current tenancy</span> : ls.map((l, i) => <div key={i}>{l.tenant} · {money(l.rent)}/mo · ends {nice(l.end)}</div>)}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Maintenance</div>
                              <div>{open.length} open{doneJobs.length ? ` · ${doneJobs.length} completed this period` : ''}</div>
                              {open.slice(0, 3).map(j => <div key={j.id} style={{ color: C.muted, fontSize: 12.5 }}>• {j.title}</div>)}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>Certificates due in 60 days</div>
                              {certs.length === 0 ? <span style={{ color: C.green }}>All in date</span> : certs.map(c => <div key={c.id} style={{ color: c.expiry_date < today ? C.red : '#B76E00' }}>{c.type} — {c.expiry_date < today ? 'expired' : 'expires'} {nice(c.expiry_date)}</div>)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </Section>

                <Section n={5} title="Notes from your property manager">
                  <textarea className="no-print" value={note} onChange={e => setNote(e.target.value)} placeholder="Anything the landlord should know this period — e.g. rent increase agreed, boiler serviced, tenant giving notice…" style={{ ...input, minHeight: 70, resize: 'vertical', fontSize: 13 }} />
                  {note && <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 6 }}>{note}</div>}
                </Section>

                {(current.bank_name || current.account_number) && (
                  <div style={{ marginTop: 22, fontSize: 12, color: C.faint }}>
                    Payments go to {current.account_name || current.name} · {current.bank_name ?? ''} {current.sort_code ? `· ${current.sort_code}` : ''} {current.account_number ? `· ****${String(current.account_number).slice(-4)}` : ''}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
