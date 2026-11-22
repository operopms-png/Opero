'use client'
// Property Management tabs worked out from existing records or edited in place:
// Management Agreements, Management Fees, Tenant History, Break Clauses, Rent Reconciliation, Performance Reports.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$', EUR: '€', AED: 'AED ', CAD: 'C$' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16, marginBottom: 12 }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #F2F4F7', flexWrap: 'wrap' }
const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }
const btn: React.CSSProperties = { fontSize: 12, color: '#2F6DB5', background: '#fff', border: '1px solid #2F6DB5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }
const sym = (c?: string) => SYM[c || 'GBP'] ?? ''
const money = (n: number, c?: string) => `${sym(c)}${Math.round(n).toLocaleString()}`
const today = () => new Date().toISOString().slice(0, 10)
const monthNow = () => new Date().toISOString().slice(0, 7)
const monthRange = (m: string) => { const [y, mo] = m.split('-').map(Number); return [`${m}-01`, new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10)] }
const Empty = ({ t }: { t: string }) => <div style={{ textAlign: 'center', padding: 50, color: '#98A2B3', fontSize: 14 }}>{t}</div>

function useRows(userId: string, tables: string[]) {
  const [d, setD] = useState<any[][] | null>(null)
  const [n, setN] = useState(0)
  useEffect(() => { if (!userId) return; (async () => {
    const res = await Promise.all(tables.map(t => supabase.from(t).select('*').eq('user_id', userId)))
    setD(res.map(r => r.data ?? []))
  })() /* eslint-disable-next-line */ }, [userId, n])
  return [d, () => setN(x => x + 1)] as const
}
const cur = (props: any[], id: string) => props.find(p => p.id === id)?.currency || 'GBP'

export function ManagementAgreements({ userId }: { userId: string }) {
  const [d, reload] = useRows(userId, ['pm_landlords'])
  const [edit, setEdit] = useState<string | null>(null)
  const [f, setF] = useState<any>({})
  if (!d) return <Empty t="Loading…" />
  const in90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)
  async function save(id: string) {
    await supabase.from('pm_landlords').update({ agreement_type: f.agreement_type || null, agreement_start: f.agreement_start || null, agreement_end: f.agreement_end || null, management_fee_pct: f.management_fee_pct === '' || f.management_fee_pct == null ? null : Number(f.management_fee_pct), agreement_terms: f.agreement_terms || null }).eq('id', id)
    setEdit(null); reload()
  }
  return <div>{d[0].length === 0 ? <Empty t="No landlords yet" /> : d[0].map((l: any) => (
    <div key={l.id} style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div><b>{l.name}</b><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{[l.agreement_type || 'No agreement recorded', l.agreement_start && `from ${l.agreement_start}`, l.agreement_end && `to ${l.agreement_end}`, l.management_fee_pct != null && `${l.management_fee_pct}% fee`].filter(Boolean).join(' · ')}</div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {l.agreement_end && l.agreement_end < today() && <span style={{ fontSize: 11, fontWeight: 600, color: '#B42318' }}>Expired</span>}
          {l.agreement_end && l.agreement_end >= today() && l.agreement_end <= in90 && <span style={{ fontSize: 11, fontWeight: 600, color: '#B54708' }}>Ends within 90 days</span>}
          <button style={btn} onClick={() => { setEdit(edit === l.id ? null : l.id); setF({ agreement_type: l.agreement_type ?? '', agreement_start: l.agreement_start ?? '', agreement_end: l.agreement_end ?? '', management_fee_pct: l.management_fee_pct ?? '', agreement_terms: l.agreement_terms ?? '' }) }}>{edit === l.id ? 'Close' : 'Edit'}</button>
        </div>
      </div>
      {edit === l.id && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 12 }}>
        <select style={inp} value={f.agreement_type} onChange={e => setF({ ...f, agreement_type: e.target.value })}><option value="">Agreement type</option>{['Full management', 'Let only', 'Rent collection', 'Master lease', 'Guaranteed rent'].map(o => <option key={o}>{o}</option>)}</select>
        <input style={inp} type="date" value={f.agreement_start} onChange={e => setF({ ...f, agreement_start: e.target.value })} title="Starts" />
        <input style={inp} type="date" value={f.agreement_end} onChange={e => setF({ ...f, agreement_end: e.target.value })} title="Ends" />
        <input style={inp} type="number" placeholder="Management fee %" value={f.management_fee_pct} onChange={e => setF({ ...f, management_fee_pct: e.target.value })} />
        <textarea style={{ ...inp, gridColumn: '1 / -1' }} placeholder="Terms" value={f.agreement_terms} onChange={e => setF({ ...f, agreement_terms: e.target.value })} />
        <button style={{ ...btn, background: '#2F6DB5', color: '#fff' }} onClick={() => save(l.id)}>Save agreement</button>
      </div>}
    </div>))}</div>
}

export function ManagementFees({ userId, properties }: { userId: string; properties: any[] }) {
  const [d] = useRows(userId, ['pm_landlords', 'pm_rent_payments'])
  const [m, setM] = useState(monthNow())
  if (!d) return <Empty t="Loading…" />
  const [from, to] = monthRange(m)
  const paid = d[1].filter((p: any) => p.status === 'paid' && (p.category ?? 'Rent') === 'Rent' && (p.paid_date ?? p.due_date ?? '') >= from && (p.paid_date ?? p.due_date ?? '') <= to)
  const lines = properties.map(p => {
    const l = d[0].find((x: any) => x.id === p.owner_id)
    const collected = paid.filter((x: any) => x.property_id === p.id).reduce((a: number, x: any) => a + (Number(x.amount) || 0), 0)
    const pct = l?.management_fee_pct == null ? null : Number(l.management_fee_pct)
    return { p, l, collected, pct, fee: pct == null ? 0 : collected * pct / 100 }
  }).filter(x => x.collected > 0 || x.pct != null)
  const tot: Record<string, number> = {}; lines.forEach(x => { const c = x.p.currency || 'GBP'; tot[c] = (tot[c] || 0) + x.fee })
  return <div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}><label style={{ fontSize: 13 }}>Month</label><input type="month" style={inp} value={m} onChange={e => setM(e.target.value)} /></div>
    <div style={card}><div style={h}>Fees earned</div>{Object.keys(tot).length ? Object.entries(tot).map(([c, n]) => <div key={c} style={row}><span>{c}</span><b>{money(n, c)}</b></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>No fees for this month</div>}</div>
    <div style={card}><div style={h}>By property</div>
      {lines.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>Set a management fee % on each landlord under Management Agreements, then record rent payments.</div> : lines.map(x => <div key={x.p.id} style={row}><span><b>{x.p.name}</b> · {x.l?.name ?? 'No landlord'}</span><span>Collected {money(x.collected, x.p.currency)} · {x.pct == null ? 'no fee set' : `${x.pct}% = `}<b>{x.pct == null ? '' : money(x.fee, x.p.currency)}</b></span></div>)}</div>
  </div>
}

export function TenantHistory({ userId, properties }: { userId: string; properties: any[] }) {
  const [d] = useRows(userId, ['pm_tenants', 'pm_leases', 'pm_rent_payments', 'pm_maintenance'])
  const [tid, setTid] = useState('')
  if (!d) return <Empty t="Loading…" />
  const leases = d[1].filter((x: any) => x.tenant_id === tid), pays = d[2].filter((x: any) => x.tenant_id === tid), tix = d[3].filter((x: any) => x.tenant_id === tid)
  const pn = (id: string) => properties.find(p => p.id === id)?.name ?? '—'
  return <div>
    <select style={{ ...inp, marginBottom: 12, minWidth: 260 }} value={tid} onChange={e => setTid(e.target.value)}><option value="">Choose a tenant</option>{d[0].map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
    {!tid ? <Empty t="Choose a tenant to see their history" /> : <>
      <div style={card}><div style={h}>Tenancies</div>{leases.length ? leases.map((l: any) => <div key={l.id} style={row}><span>{pn(l.property_id)}</span><span>{l.start_date} to {l.end_date ?? 'open'} · {money(Number(l.monthly_rent) || 0, cur(properties, l.property_id))}/month · {l.status}</span></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>No tenancies</div>}</div>
      <div style={card}><div style={h}>Rent: {pays.filter((x: any) => x.status === 'paid').length} paid, {pays.filter((x: any) => x.status === 'overdue').length} overdue</div>{pays.slice().sort((a: any, b: any) => String(b.due_date).localeCompare(String(a.due_date))).slice(0, 12).map((x: any) => <div key={x.id} style={row}><span>{x.due_date}</span><span>{money(Number(x.amount) || 0, cur(properties, x.property_id))} · {x.status}</span></div>)}{!pays.length && <div style={{ fontSize: 13, color: '#98A2B3' }}>No payments recorded</div>}</div>
      <div style={card}><div style={h}>Repairs reported</div>{tix.length ? tix.map((x: any) => <div key={x.id} style={row}><span>{x.title}</span><span>{x.status} · {String(x.created_at).slice(0, 10)}</span></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>None</div>}</div></>}
  </div>
}

export function BreakClauses({ userId, properties }: { userId: string; properties: any[] }) {
  const [d, reload] = useRows(userId, ['pm_leases', 'pm_tenants'])
  if (!d) return <Empty t="Loading…" />
  const tn = (id: string) => d[1].find((t: any) => t.id === id)?.name ?? 'Tenant'
  const pn = (id: string) => properties.find(p => p.id === id)?.name ?? '—'
  const leases = d[0].filter((l: any) => l.status === 'active')
  async function patch(id: string, p: any) { await supabase.from('pm_leases').update(p).eq('id', id); reload() }
  return leases.length === 0 ? <Empty t="No active leases" /> : <div>{leases.map((l: any) => {
    const notice = l.break_date && l.break_notice_days != null ? new Date(new Date(l.break_date).getTime() - l.break_notice_days * 864e5).toISOString().slice(0, 10) : null
    const late = notice && notice < today() && l.break_date >= today()
    return <div key={l.id} style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div><b>{tn(l.tenant_id)}</b> · {pn(l.property_id)}<div style={{ fontSize: 12, color: '#667085' }}>Lease {l.start_date} to {l.end_date ?? 'open'}</div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12 }}>Break date <input style={inp} type="date" defaultValue={l.break_date ?? ''} onBlur={e => { if ((e.target.value || null) !== l.break_date) patch(l.id, { break_date: e.target.value || null }) }} /></label>
          <label style={{ fontSize: 12 }}>Notice (days) <input style={{ ...inp, width: 80 }} type="number" defaultValue={l.break_notice_days ?? ''} onBlur={e => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== l.break_notice_days) patch(l.id, { break_notice_days: v }) }} /></label>
        </div>
      </div>
      {notice && <div style={{ fontSize: 12, marginTop: 8, color: late ? '#B42318' : '#344054', fontWeight: late ? 600 : 400 }}>Notice must be given by {notice}{late ? ' (deadline passed)' : ''}</div>}
    </div>
  })}</div>
}

export function RentReconciliation({ userId, properties }: { userId: string; properties: any[] }) {
  const [d] = useRows(userId, ['pm_leases', 'pm_rent_payments', 'pm_tenants'])
  const [m, setM] = useState(monthNow())
  if (!d) return <Empty t="Loading…" />
  const [from, to] = monthRange(m)
  const tn = (id: string) => d[2].find((t: any) => t.id === id)?.name ?? 'Tenant'
  const active = d[0].filter((l: any) => l.status === 'active' && l.start_date <= to && (!l.end_date || l.end_date >= from))
  const paid = d[1].filter((p: any) => p.status === 'paid' && (p.category ?? 'Rent') === 'Rent' && (p.paid_date ?? p.due_date ?? '') >= from && (p.paid_date ?? p.due_date ?? '') <= to)
  const rows = active.map((l: any) => { const got = paid.filter((p: any) => p.tenant_id === l.tenant_id).reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0); const exp = Number(l.monthly_rent) || 0; return { l, exp, got, diff: got - exp } })
  const matched = new Set(active.map((l: any) => l.tenant_id))
  const stray = paid.filter((p: any) => !matched.has(p.tenant_id))
  const status = (r: any) => (r.got === 0 ? ['Unpaid', '#B42318'] : r.diff < 0 ? ['Short', '#B54708'] : r.diff > 0 ? ['Over', '#B54708'] : ['Matched', '#059669'])
  return <div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}><label style={{ fontSize: 13 }}>Month</label><input type="month" style={inp} value={m} onChange={e => setM(e.target.value)} /></div>
    <div style={card}><div style={h}>Expected against received</div>
      {rows.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No active leases in this month</div> : rows.map((r: any) => { const [s, c] = status(r); const cc = cur(properties, r.l.property_id); return <div key={r.l.id} style={row}><span><b>{tn(r.l.tenant_id)}</b> · {properties.find(p => p.id === r.l.property_id)?.name ?? '—'}</span><span>Expected {money(r.exp, cc)} · Received {money(r.got, cc)} · <b style={{ color: c }}>{s}{r.diff !== 0 && r.got !== 0 ? ` ${money(Math.abs(r.diff), cc)}` : ''}</b></span></div> })}</div>
    {stray.length > 0 && <div style={card}><div style={h}>Payments not matched to an active lease</div>{stray.map((p: any) => <div key={p.id} style={row}><span>{tn(p.tenant_id)}</span><span>{money(Number(p.amount) || 0, cur(properties, p.property_id))} · {p.paid_date ?? p.due_date}</span></div>)}</div>}
  </div>
}

export function PerformanceReports({ userId, properties }: { userId: string; properties: any[] }) {
  const [d] = useRows(userId, ['pm_leases', 'pm_rent_payments', 'pm_tenants', 'pm_landlords', 'pm_maintenance', 'ai_property_values'])
  if (!d) return <Empty t="Loading…" />
  const [leases, pays, tenants, landlords, tix, vals] = d
  const tn = (id: string) => tenants.find((t: any) => t.id === id)?.name ?? 'Tenant'
  const active = leases.filter((l: any) => l.status === 'active')
  const let_ = new Set(active.map((l: any) => l.property_id))
  const occ = properties.length ? Math.round(100 * properties.filter(p => let_.has(p.id)).length / properties.length) : 0
  const overdue = pays.filter((p: any) => p.status === 'overdue')
  const byTenant: Record<string, any> = {}
  pays.forEach((p: any) => { if (!p.tenant_id) return; const r = byTenant[p.tenant_id] ??= { paid: 0, ontime: 0, over: 0 }; if (p.status === 'paid') { r.paid++; if (p.paid_date && p.due_date && p.paid_date <= p.due_date) r.ontime++ } if (p.status === 'overdue') r.over++ })
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10)
  const Box = ({ t, children }: { t: string; children: React.ReactNode }) => <div style={card}><div style={h}>{t}</div>{children}</div>
  return <div>
    <Box t="Occupancy"><div style={{ fontSize: 28, fontWeight: 600 }}>{occ}%</div><div style={{ fontSize: 12, color: '#667085' }}>{properties.filter(p => let_.has(p.id)).length} of {properties.length} properties have an active lease</div></Box>
    <Box t="Rent arrears">{overdue.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No overdue rent</div> : overdue.sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date))).map((p: any) => <div key={p.id} style={row}><span>{tn(p.tenant_id)}</span><span>{money(Number(p.amount) || 0, cur(properties, p.property_id))} · due {p.due_date}</span></div>)}</Box>
    <Box t="Tenant performance">{Object.keys(byTenant).length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No payments yet</div> : Object.entries(byTenant).map(([id, r]: any) => <div key={id} style={row}><span>{tn(id)}</span><span>{r.paid ? `${Math.round(100 * r.ontime / r.paid)}% on time` : 'no paid rent'} · {r.over} overdue</span></div>)}</Box>
    <Box t="Landlord performance (last 12 months)">{landlords.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No landlords</div> : landlords.map((l: any) => { const ps = properties.filter(p => p.owner_id === l.id); const ids = new Set(ps.map(p => p.id)); const rent = pays.filter((p: any) => ids.has(p.property_id) && p.status === 'paid' && (p.paid_date ?? '') >= yearAgo).reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0); const t = tix.filter((x: any) => ids.has(x.property_id)); const cost = t.reduce((a: number, x: any) => a + (Number(x.cost) || 0), 0); const c = ps[0]?.currency; return <div key={l.id} style={row}><span><b>{l.name}</b> · {ps.length} properties</span><span>Rent {money(rent, c)} · Repairs {money(cost, c)} · {t.filter((x: any) => x.status === 'open').length} open</span></div> })}</Box>
    <Box t="Rental yield">{properties.map(p => { const rent = active.filter((l: any) => l.property_id === p.id).reduce((a: number, l: any) => a + (Number(l.monthly_rent) || 0), 0) * 12; const v = vals.find((x: any) => x.property_id === p.id); const val = Number(v?.typical) || 0; return <div key={p.id} style={row}><span>{p.name}</span><span>{rent && val ? `${(100 * rent / val).toFixed(1)}% (${money(rent, p.currency)} a year on ${money(val, v.currency || p.currency)})` : rent ? 'No property value yet' : 'Not let'}</span></div> })}{!properties.length && <div style={{ fontSize: 13, color: '#98A2B3' }}>No properties</div>}<div style={{ fontSize: 12, color: '#98A2B3', marginTop: 8 }}>Yield uses the value from the AI property valuation.</div></Box>
  </div>
}
