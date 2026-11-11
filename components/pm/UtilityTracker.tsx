'use client'
// Electricity and internet (and other bills) per property, shown visually in one place.
// Staff mode lets the team add bills, mark them paid and choose what owners and tenants see. Portal mode is read only.
import { useCallback, useEffect, useState } from 'react'
import { limitSplit } from '@/lib/utility-limit'
import { supabase } from '@/lib/supabase'
import { providerFor, defaultUnit } from '@/lib/utility-providers'

const BLUE = '#2F6DB5', GREY = '#98A2B3'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16, marginBottom: 14 }
const SYMS: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$', EUR: '€', AED: 'AED ', CAD: 'C$' }
const sym = (c: string) => SYMS[c] ?? '£'
const money = (n: number, c: string) => `${sym(c)}${Number(n).toLocaleString('en-GB', { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`
const day = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const mon = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })
const today = () => new Date().toISOString().slice(0, 10)
const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: bg, color: fg, whiteSpace: 'nowrap' })
const ghost: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: BLUE, background: '#fff', border: `1px solid ${BLUE}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }

function Bars({ bills, cur }: { bills: any[]; cur: string }) {
  const rows = [...bills].slice(0, 12).reverse()
  if (!rows.length) return <div style={{ height: 70, display: 'grid', placeItems: 'center', fontSize: 12, color: GREY }}>No bills added yet</div>
  const max = Math.max(...rows.map(r => r.amount), 1), W = 300, H = 90, bw = Math.min(22, (W - 8) / rows.length - 4)
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label={`Bill history, latest ${money(rows[rows.length - 1].amount, cur)}`}>
      <line x1="0" x2={W} y1={H} y2={H} stroke="#E4E7EC" />
      {rows.map((r, i) => { const h = Math.max(3, (r.amount / max) * (H - 18)), x = 4 + i * ((W - 8) / rows.length) + 2, last = i === rows.length - 1
        return <g key={r.id}><rect x={x} y={H - h} width={bw} height={h} rx="3" fill={last ? BLUE : '#BFD3EC'} />
          {last && <text x={x + bw / 2} y={H - h - 4} fontSize="9.5" fontWeight="700" fill="#1B2A4A" textAnchor="middle">{money(r.amount, cur)}</text>}
          {(rows.length <= 6 || i % 2 === 0 || last) && <text x={x + bw / 2} y={H + 12} fontSize="9" fill={GREY} textAnchor="middle">{mon(r.period_end)}</text>}</g> })}
    </svg>
  )
}

function status(a: any) {
  const latest = a.bills[0]
  if (latest && !latest.paid) { const d = latest.due_date; if (d && d < today()) return ['Overdue', '#FEE4E2', '#B42318']; return [d ? `Due ${day(d)}` : 'Unpaid', '#FEF0C7', '#B54708'] }
  if (latest) return ['Paid', '#E7F6EC', '#067647']
  if (a.next_bill_date) return [`Next bill ${day(a.next_bill_date)}`, '#F2F4F7', '#667085']
  return ['No bills yet', '#F2F4F7', '#667085']
}

export default function UtilityTracker({ staff = false, kind, id, link, hideEmpty = false }: { staff?: boolean; kind?: 'landlord' | 'tenant'; id?: string; link?: string; hideEmpty?: boolean }) {
  const [props, setProps] = useState<any[] | null>(null)
  const [err, setErr] = useState(''), [msg, setMsg] = useState('')
  const [open, setOpen] = useState<string>(''), [adding, setAdding] = useState<string>('')
  const [f, setF] = useState<any>({}), [busy, setBusy] = useState(false)

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    if (link) return { 'x-client-link': link }
    const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session?.access_token ?? ''}` }
  }, [link])
  const load = useCallback(async () => {
    const url = staff ? '/api/utilities' : `/api/portal-utilities?kind=${kind}${id ? '&id=' + id : ''}`
    const r = await fetch(url, { headers: await headers() }); const j = await r.json().catch(() => ({}))
    if (!r.ok) setErr(j.error || 'Could not load.'); else { setErr(''); setProps(j.properties) }
  }, [staff, kind, id, headers])
  useEffect(() => { load() }, [load])

  async function send(method: string, url: string, body?: any) {
    setBusy(true); setMsg('')
    const h = await headers(); const init: RequestInit = { method, headers: body && !(body instanceof FormData) ? { ...h, 'Content-Type': 'application/json' } : h }
    if (body) init.body = body instanceof FormData ? body : JSON.stringify(body)
    const r = await fetch(url, init); const j = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok) { setMsg(j.error || 'Something went wrong.'); return false }
    await load(); return true
  }
  async function addBill(a: any) {
    const fd = new FormData(); fd.set('utility_id', a.id); fd.set('amount', f.amount ?? ''); fd.set('period_end', f.period_end || today()); fd.set('due_date', f.due_date ?? ''); fd.set('usage', f.usage ?? ''); fd.set('usage_unit', f.usage_unit || defaultUnit(a.service)); fd.set('paid', f.paid ? 'true' : 'false')
    if (f.file) fd.set('file', f.file)
    if (await send('POST', '/api/utilities', fd)) { setAdding(''); setF({}); setMsg('Bill added.') }
  }

  if (err) return hideEmpty ? null : <div style={{ ...card, color: '#B42318' }}>{err}</div>
  if (!props) return <div style={{ textAlign: 'center', padding: 40, color: GREY }}>Loading…</div>
  if (!props.length && hideEmpty) return null
  if (!props.length) return <div style={{ ...card, textAlign: 'center', color: GREY, padding: 40 }}>{staff ? 'No bill accounts yet. Add one under Accounts, for example JPS for electricity or Flow for internet.' : 'No utilities have been shared with you yet.'}</div>

  return (
    <div>
      {msg && <div style={{ ...card, padding: '10px 14px', fontSize: 13.5, color: '#2F5DA0', background: '#F2F7FD' }}>{msg}</div>}
      {props.map(p => {
        const monthly = p.accounts.reduce((s: number, a: any) => s + (a.bills[0]?.amount ?? a.monthly_amount ?? 0), 0)
        return (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1B2A4A' }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#667085' }}>Latest bills together <b style={{ color: '#1B2A4A' }}>{money(monthly, p.currency)}</b></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginTop: 12 }}>
              {p.accounts.map((a: any) => {
                const pr = providerFor(a.supplier), st = status(a), l = a.bills[0], prev = a.bills[1], key = a.id
                const change = l && prev && prev.amount > 0 ? Math.round(((l.amount - prev.amount) / prev.amount) * 100) : null
                const spike = change != null && change >= 30
                return (
                  <div key={key} style={{ border: '1px solid #E4E7EC', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div><div style={{ fontWeight: 700, color: '#1B2A4A' }}>{/broad/i.test(a.service) ? 'Internet' : a.service}</div>
                        <div style={{ fontSize: 12, color: '#667085' }}>{a.supplier || 'No supplier'}{a.account_reference ? ` · ${a.account_reference}` : ''}</div></div>
                      <span style={pill(st[1], st[2])}>{st[0]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: '#1B2A4A' }}>{l ? money(l.amount, p.currency) : a.monthly_amount != null ? money(a.monthly_amount, p.currency) : '—'}</span>
                      {change != null && <span style={{ fontSize: 12, fontWeight: 600, color: spike ? '#B42318' : change > 0 ? '#B54708' : '#067647' }}>{change > 0 ? '+' : ''}{change}% on last bill{spike ? ' · high' : ''}</span>}
                    </div>
                    {l?.usage != null && <div style={{ fontSize: 12, color: '#667085' }}>{l.usage.toLocaleString()} {l.usage_unit || ''} used</div>}
                    {(() => { const sp = l ? limitSplit(l.amount, a.covered_limit) : null; if (!sp) return null; const pc = l.amount ? (sp.covered / l.amount) * 100 : 100; const mine = kind === 'tenant'
                      return <div style={{ marginTop: 8 }}>
                        <div role="img" aria-label={`Covered ${money(sp.covered, p.currency)}, ${mine ? 'your share' : 'tenant pays'} ${money(sp.over, p.currency)}`} style={{ display: 'flex', height: 16, borderRadius: 5, overflow: 'hidden', background: '#E4E7EC' }}><i style={{ width: pc + '%', background: BLUE }} /><i style={{ width: (100 - pc) + '%', background: '#E8A33D' }} /></div>
                        <div style={{ fontSize: 12, color: '#475467', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}><span>Covered <b>{money(sp.covered, p.currency)}</b></span><span>{mine ? 'Your share' : 'Tenant pays'} <b>{money(sp.over, p.currency)}</b></span></div>
                        {mine && <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Your stay includes electricity up to {money(a.covered_limit, p.currency)} per bill. Anything above is invoiced to you and appears in your documents link.</div>}
                      </div> })()}
                    <Bars bills={a.bills} cur={p.currency} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {pr && <a href={pr.site} target="_blank" rel="noreferrer" style={{ ...ghost, textDecoration: 'none' }}>Open {pr.name}</a>}
                      <button style={ghost} onClick={() => setOpen(open === key ? '' : key)}>{open === key ? 'Hide bills' : `Bills (${a.bills.length})`}</button>
                      {staff && <button style={{ ...ghost, background: BLUE, color: '#fff' }} onClick={() => { setAdding(adding === key ? '' : key); setOpen(key); setF({}) }}>Add bill</button>}
                    </div>
                    {staff && adding === key && <div style={{ marginTop: 10, background: '#F9FAFB', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><label style={{ fontSize: 11, color: '#667085' }} htmlFor={`am-${key}`}>Amount ({sym(p.currency)}) *</label><input id={`am-${key}`} style={inp} inputMode="decimal" value={f.amount ?? ''} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
                        <div><label style={{ fontSize: 11, color: '#667085' }} htmlFor={`bd-${key}`}>Bill date</label><input id={`bd-${key}`} style={inp} type="date" value={f.period_end ?? today()} onChange={e => setF({ ...f, period_end: e.target.value })} /></div>
                        <div><label style={{ fontSize: 11, color: '#667085' }} htmlFor={`us-${key}`}>Usage ({defaultUnit(a.service) || 'units'})</label><input id={`us-${key}`} style={inp} inputMode="decimal" value={f.usage ?? ''} onChange={e => setF({ ...f, usage: e.target.value })} /></div>
                        <div><label style={{ fontSize: 11, color: '#667085' }} htmlFor={`du-${key}`}>Due date</label><input id={`du-${key}`} style={inp} type="date" value={f.due_date ?? ''} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
                      </div>
                      <label style={{ fontSize: 11, color: '#667085', display: 'block', marginTop: 8 }} htmlFor={`fi-${key}`}>Bill (PDF or photo, optional)</label><input id={`fi-${key}`} type="file" accept="application/pdf,image/*" onChange={e => setF({ ...f, file: e.target.files?.[0] })} style={{ fontSize: 12 }} />
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, marginTop: 8 }}><input type="checkbox" checked={!!f.paid} onChange={e => setF({ ...f, paid: e.target.checked })} />Already paid</label>
                      <button style={{ ...ghost, background: BLUE, color: '#fff', marginTop: 8 }} disabled={busy} onClick={() => addBill(a)}>{busy ? 'Saving…' : 'Save bill'}</button>
                    </div>}
                    {open === key && a.bills.length > 0 && <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto' }}>
                      {a.bills.map((b: any) => <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '6px 0', borderTop: '1px solid #F0F1F4', fontSize: 12.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{day(b.period_end)}{b.source === 'email' && <span style={{ ...pill('#EAF1FB', '#2F5DA0'), marginLeft: 6 }}>From email</span>}</span><b>{money(b.amount, p.currency)}{(() => { const sp = limitSplit(b.amount, a.covered_limit); return sp && sp.over > 0 ? <span style={{ fontWeight: 400, fontSize: 11.5, color: '#B54708' }}> · {kind === 'tenant' ? 'your share' : 'tenant'} {money(sp.over, p.currency)}</span> : null })()}</b>
                        <span style={pill(b.paid ? '#E7F6EC' : '#FEF0C7', b.paid ? '#067647' : '#B54708')}>{b.paid ? 'Paid' : 'Unpaid'}</span>
                        <span style={{ display: 'flex', gap: 8 }}>
                          {b.url && <a href={b.url} target="_blank" rel="noreferrer" style={{ color: BLUE, fontWeight: 600 }}>View bill</a>}
                          {staff && (limitSplit(b.amount, a.covered_limit)?.over ?? 0) > 0 && (b.tenant_invoice_id ? <span style={{ fontSize: 12.5, color: '#067647' }}>Tenant invoiced</span> : <button style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: 12.5, padding: 0, fontWeight: 600 }} disabled={busy} onClick={async () => { const r = await send('PATCH', '/api/utilities', { bill_id: b.id, invoice_tenant: true }); if (r) setMsg('Draft invoice created for the tenant. Review and send it from Invoices.') }}>Invoice tenant</button>)}
                          {staff && <button style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontSize: 12.5, padding: 0 }} onClick={() => send('PATCH', '/api/utilities', { bill_id: b.id, paid: !b.paid })}>{b.paid ? 'Mark unpaid' : 'Mark paid'}</button>}
                          {staff && <button style={{ background: 'none', border: 'none', color: '#B42318', cursor: 'pointer', fontSize: 12.5, padding: 0 }} onClick={() => { if (window.confirm('Delete this bill?')) send('DELETE', '/api/utilities?bill_id=' + b.id) }}>Delete</button>}
                        </span></div>)}
                    </div>}
                    {staff && a.inbox && <div style={{ marginTop: 8, background: '#F2F7FD', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#475467' }}>
                      <div><b>Automatic bills.</b> Set this as the e-bill email on the {a.supplier || 'supplier'} account, or forward each bill to it. The amount, due date and usage are read and added by themselves.</div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{a.inbox}</span><button style={ghost} onClick={() => { try { navigator.clipboard.writeText(a.inbox); setMsg('Address copied.') } catch { setMsg('Select the address and copy it.') } }}>Copy</button></div>
                    </div>}
                    {staff && <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#475467', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={a.visible_to_owner} onChange={e => send('PATCH', '/api/utilities', { utility_id: a.id, visible_to_owner: e.target.checked })} />Owner sees</label>
                      <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={a.visible_to_tenant} onChange={e => send('PATCH', '/api/utilities', { utility_id: a.id, visible_to_tenant: e.target.checked })} />Tenant sees</label>
                    </div>}
                    {staff && /electric/i.test(a.service) && <div style={{ marginTop: 8, background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#475467' }}>
                      <label htmlFor={`lim-${key}`}><b>Covered limit per bill</b> ({sym(p.currency)}). Anything above is the tenant's. Leave blank for no limit.</label>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <input id={`lim-${key}`} style={{ ...inp, maxWidth: 130 }} inputMode="decimal" value={f['lim' + key] ?? (a.covered_limit ?? '')} onChange={e => setF({ ...f, ['lim' + key]: e.target.value })} />
                        <button style={ghost} disabled={busy} onClick={async () => { if (await send('PATCH', '/api/utilities', { utility_id: a.id, covered_limit: String(f['lim' + key] ?? a.covered_limit ?? '') })) setMsg('Limit saved.') }}>Save limit</button>
                        <button style={ghost} disabled={busy} onClick={async () => { const v = String(f['lim' + key] ?? a.covered_limit ?? ''); if (v === '') return setMsg('Type the limit first.'); if (window.confirm(`Set ${sym(p.currency)}${Number(v).toLocaleString()} as the covered limit on every electricity account?`) && await send('PATCH', '/api/utilities', { apply_limit_all: Number(v) })) setMsg('Limit applied to all electricity accounts.') }}>Apply to all electricity</button>
                      </div>
                    </div>}
                  </div>)
              })}
            </div>
          </div>)
      })}
    </div>
  )
}
