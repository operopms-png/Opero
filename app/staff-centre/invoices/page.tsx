'use client'
// Staff Centre → Finance → Invoices, in the Sangsters invoice format.
// List: unpaid / overdue / paid with Mark paid. Editor (?id=… or ?new=1): pick
// who to bill, add lines, choose currency and due date — the invoice on the
// right updates as you type. The fixed parts (logo, contact details, bank
// details, signature, terms) come from Invoice settings, which only admins edit.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty, Modal, btn, input, label } from '../../../components/crm/Page'
import { staffApi, money } from '../../../lib/staff-api'
import InvoiceView from '../../../components/invoices/InvoiceView'

const STATUS: Record<string, { l: string; bg: string; c: string }> = {
  draft: { l: 'Draft', bg: '#F2F2F2', c: '#5C5850' }, sent: { l: 'Unpaid', bg: '#FBF6EA', c: '#8E6B1F' }, overdue: { l: 'Overdue', bg: '#FDECEC', c: '#B42318' },
  paid: { l: 'Paid', bg: '#E6F7EF', c: '#0E7C55' }, void: { l: 'Void', bg: '#F2F2F2', c: '#8A877F' },
}
const QUICK = [['Monthly rent', 'Monthly rent'], ['Rent upfront', '3 months rent upfront'], ['Deposit', 'Security deposit'], ['Admin fee', 'Admin fee'], ['Cleaning fee', 'Cleaning fee'], ['Partner membership', 'Partner Programme membership']]
const fmt = (d?: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())

async function downloadPdf(id: string, name: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/invoices?id=${id}&pdf=1`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
  if (!res.ok) { alert('Could not make the PDF'); return }
  const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = name + '.pdf'; a.click(); URL.revokeObjectURL(url)
}

export default function Invoices() {
  const [view, setView] = useState<{ id?: string; isNew?: boolean } | null>(null)
  useEffect(() => {
    const read = () => { const sp = new URLSearchParams(window.location.search); setView(sp.get('id') ? { id: sp.get('id')! } : sp.get('new') ? { isNew: true } : null) }
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read)
  }, [])
  const go = (v: { id?: string; isNew?: boolean } | null) => { window.history.pushState(null, '', v?.id ? `?id=${v.id}` : v?.isNew ? '?new=1' : window.location.pathname); setView(v); window.scrollTo(0, 0) }
  return view ? <Editor id={view.id} back={() => go(null)} onCreated={id => go({ id })} /> : <List open={go} />
}

// ── list ────────────────────────────────────────────────────────────────
function List({ open }: { open: (v: any) => void }) {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [tab, setTab] = useState('all'), [q, setQ] = useState(''), [settings, setSettings] = useState(false)
  const load = () => staffApi('/api/invoices').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const all: any[] = d?.invoices || []
  const n = (s: string) => all.filter(i => i.shown_status === s).length
  const sum = (rows: any[]) => { const o: Record<string, number> = {}; rows.forEach(r => { o[r.currency] = (o[r.currency] || 0) + Number(r.total) }); return Object.entries(o).map(([c, v]) => money(v, c)).join(' + ') || '—' }
  const month = todayStr().slice(0, 7)
  const shown = all.filter(i => (tab === 'all' || i.shown_status === tab) && (!q || [i.number, i.bill_to_name, i.bill_to_email].join(' ').toLowerCase().includes(q.toLowerCase())))
  async function act(i: any, action: string) {
    try { await staffApi('/api/invoices', { action, id: i.id }); load() } catch (e: any) { alert(e.message) }
  }
  return (
    <CrmPage>
      <CrmHeader title="Invoices" subtitle="Invoices in the Sangsters format. Paid invoices count as money in on Finance."
        actions={<>{d?.isAdmin && <button style={btn('ghost')} onClick={() => setSettings(true)}>Invoice settings</button>}<button style={btn('gold')} onClick={() => open({ isNew: true })}>+ New invoice</button></>}
        tabs={[{ k: 'all', l: 'All', count: all.length }, { k: 'sent', l: 'Unpaid', count: n('sent') }, { k: 'overdue', l: 'Overdue', count: n('overdue') }, { k: 'paid', l: 'Paid', count: n('paid') }, { k: 'draft', l: 'Drafts', count: n('draft') }]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="Unpaid" value={n('sent')} sub={sum(all.filter(i => i.shown_status === 'sent'))} />
            <Stat label="Overdue" value={<span style={{ color: n('overdue') ? C.red : C.ink }}>{n('overdue')}</span>} sub={sum(all.filter(i => i.shown_status === 'overdue'))} />
            <Stat label="Paid this month" value={all.filter(i => i.status === 'paid' && i.paid_at?.slice(0, 7) === month).length} sub={sum(all.filter(i => i.status === 'paid' && i.paid_at?.slice(0, 7) === month))} highlight />
            <Stat label="Next number" value={`${d.settings?.prefix || 'INV'}${String(d.settings?.next_number || 1).padStart(4, '0')}`} />
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search number, name or email" style={{ ...input, maxWidth: 320, marginBottom: 14 }} />
          {shown.length === 0 ? <Empty>{all.length === 0 ? <>No invoices yet. Press <b>New invoice</b> — pick who it’s for, add the lines, and it comes out in the Sangsters format ready to send.</> : 'No invoices match.'}</Empty> : (
            <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 780 }}>
                <thead><tr style={{ background: '#F7F8FA' }}>{['Number', 'Bill to', 'Date', 'Due', 'Amount', 'Status', ''].map((h, i) => <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '9px 16px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
                <tbody>{shown.map(i => { const st = STATUS[i.shown_status] || STATUS.draft; return (
                  <tr key={i.id} style={{ borderTop: '1px solid #F0F1F4', cursor: 'pointer' }} onClick={() => open({ id: i.id })}>
                    <td style={td}><b>{i.number}</b></td>
                    <td style={td}><div style={{ fontWeight: 600 }}>{i.bill_to_name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{i.sent_to ? `Sent to ${i.sent_to}` : i.bill_to_email || ''}{i.viewed_at ? ' · opened' : ''}</div></td>
                    <td style={td}>{fmt(i.issue_date)}</td><td style={td}>{i.due_date ? fmt(i.due_date) : 'On receipt'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(i.total, i.currency)}</td>
                    <td style={td}><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: st.bg, color: st.c }}>{st.l}</span></td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      {d.isAdmin && ['sent', 'overdue'].includes(i.shown_status) && <button style={btn('gold', true)} onClick={() => act(i, 'paid')}>Mark paid</button>}
                      <button style={{ ...btn('ghost', true), marginLeft: 6 }} onClick={() => downloadPdf(i.id, i.number)}>PDF</button>
                    </td>
                  </tr>) })}</tbody>
              </table>
            </div>
          )}
        </>}
      </Body>
      {settings && d && <SettingsModal s={d.settings} onClose={() => setSettings(false)} onSaved={() => { setSettings(false); load() }} />}
    </CrmPage>
  )
}

// ── editor ──────────────────────────────────────────────────────────────
function Editor({ id, back, onCreated }: { id?: string; back: () => void; onCreated: (id: string) => void }) {
  const [inv, setInv] = useState<any>(null), [s, setS] = useState<any>(null), [err, setErr] = useState(''), [saving, setSaving] = useState(false), [sending, setSending] = useState(false), [dirty, setDirty] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    (async () => {
      try {
        if (id) { const r = await staffApi('/api/invoices?id=' + id); setInv(r.invoice); setS(r.settings) }
        else { const r = await staffApi('/api/invoices'); setS(r.settings); setInv({ bill_to_name: '', currency: 'GBP', issue_date: todayStr(), due_date: null, items: [{ description: '', qty: 1, amount: '' }], status: 'draft', shown_status: 'draft' }) }
        const r2 = await staffApi('/api/approvals'); setIsAdmin(!!r2.isAdmin)
      } catch (e: any) { setErr(e.message) }
    })()
  }, [id])
  const set = (k: string, v: any) => { setInv((x: any) => ({ ...x, [k]: v })); setDirty(true) }
  const setItem = (i: number, k: string, v: any) => set('items', inv.items.map((it: any, j: number) => j === i ? { ...it, [k]: v } : it))
  const locked = inv?.status === 'paid' || inv?.status === 'void'
  const total = (inv?.items || []).reduce((a: number, i: any) => a + (Number(i.qty) || 1) * (Number(i.amount) || 0), 0)

  async function save(quiet = false) {
    setSaving(true); setErr('')
    try {
      const r = await staffApi('/api/invoices', { action: 'save', ...inv, id: inv.id })
      setInv(r.invoice); setDirty(false)
      if (!inv.id) onCreated(r.invoice.id)
      setSaving(false); return r.invoice
    } catch (e: any) { setErr(e.message); setSaving(false); if (!quiet) return null; throw e }
  }
  async function send() {
    const to = window.prompt('Send this invoice to which email?', inv.bill_to_email || '')
    if (!to) return
    setSending(true); setErr('')
    try {
      const saved = dirty || !inv.id ? await save(true) : inv
      if (!saved) { setSending(false); return }
      const r = await staffApi('/api/invoices', { action: 'send', id: saved.id, to })
      setInv(r.invoice); alert(`Sent to ${to}.`)
    } catch (e: any) { setErr(e.message) }
    setSending(false)
  }
  async function act(action: string) { try { const r = await staffApi('/api/invoices', { action, id: inv.id }); if (action === 'delete') back(); else setInv(r.invoice) } catch (e: any) { alert(e.message) } }

  if (err && !inv) return <CrmPage><Body><button style={btn('ghost')} onClick={back}>← Invoices</button><div style={{ color: C.red, marginTop: 14 }}>{err}</div></Body></CrmPage>
  if (!inv || !s) return <CrmPage><Loading /></CrmPage>
  const st = STATUS[inv.shown_status] || STATUS.draft
  return (
    <CrmPage>
      <Body style={{ paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button style={btn('ghost', true)} onClick={() => { if (!dirty || confirm('Leave without saving?')) back() }}>← Invoices</button>
          <b style={{ fontSize: 20, color: C.ink }}>{inv.number ? `Invoice ${inv.number}` : 'New invoice'}</b>
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: st.bg, color: st.c }}>{st.l}</span>
          {inv.sent_at && <span style={{ fontSize: 12.5, color: C.muted }}>Sent to {inv.sent_to} · {new Date(inv.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{inv.viewed_at ? ' · opened' : ''}</span>}
        </div>
        {err && <div style={{ color: C.red, margin: '10px 0' }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px,430px) minmax(0,1fr)', gap: 20, marginTop: 14, alignItems: 'start' }} className="inv-grid">
          <style>{`@media(max-width:1100px){.inv-grid{grid-template-columns:1fr!important}}`}</style>
          <fieldset disabled={locked} style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 14, minWidth: 0 }}>
            <div style={card}><label style={label}>Bill to</label><PersonPicker inv={inv} onPick={p => { setInv((x: any) => ({ ...x, bill_to_name: p.name, bill_to_email: p.email || x.bill_to_email, bill_to_phone: p.phone || '', bill_to_address: p.address || '', person_kind: p.kind, person_id: p.id, module: p.module })); setDirty(true) }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div><label style={label}>Name *</label><input style={input} value={inv.bill_to_name || ''} onChange={e => set('bill_to_name', e.target.value)} /></div>
                <div><label style={label}>Phone</label><input style={input} value={inv.bill_to_phone || ''} onChange={e => set('bill_to_phone', e.target.value)} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={label}>Address (optional)</label><textarea rows={2} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} value={inv.bill_to_address || ''} onChange={e => set('bill_to_address', e.target.value)} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={label}>Email (for sending)</label><input style={input} type="email" value={inv.bill_to_email || ''} onChange={e => set('bill_to_email', e.target.value)} /></div>
              </div></div>
            <div style={card}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div><label style={label}>Number</label><div style={{ ...input, background: '#F7F8FA', color: C.muted }}>{inv.number || 'On save'}</div></div>
              <div><label style={label}>Date</label><input style={input} type="date" value={inv.issue_date || ''} onChange={e => set('issue_date', e.target.value)} /></div>
              <div><label style={label}>Due</label><select style={input} value={inv.due_date ? 'date' : 'receipt'} onChange={e => set('due_date', e.target.value === 'date' ? todayStr() : null)}><option value="receipt">On receipt</option><option value="date">By a date</option></select></div>
            </div>{inv.due_date && <input style={{ ...input, marginTop: 8 }} type="date" value={inv.due_date} onChange={e => set('due_date', e.target.value)} />}</div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 14 }}>Items</b>
                <div style={{ display: 'inline-flex', border: '1px solid ' + C.border, borderRadius: 6, overflow: 'hidden' }}>{['GBP', 'JMD', 'USD'].map(cu => <button key={cu} type="button" onClick={() => set('currency', cu)} style={{ padding: '5px 10px', border: 'none', background: inv.currency === cu ? C.goldDark : '#fff', color: inv.currency === cu ? '#fff' : C.ink, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{{ GBP: '£', JMD: 'J$', USD: '$' }[cu]}</button>)}</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 100px 22px', gap: 6, marginTop: 10, fontSize: 11.5, color: C.muted }}><span>Description</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Amount</span><span /></div>
              {inv.items.map((it: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 100px 22px', gap: 6, marginTop: 6 }}>
                  <input style={input} value={it.description} placeholder="What it’s for" onChange={e => setItem(i, 'description', e.target.value)} />
                  <input style={{ ...input, textAlign: 'center' }} type="number" min="1" value={it.qty} onChange={e => setItem(i, 'qty', e.target.value)} />
                  <input style={{ ...input, textAlign: 'right' }} type="number" step="0.01" value={it.amount} placeholder="0.00" onChange={e => setItem(i, 'amount', e.target.value)} />
                  <button type="button" aria-label="Remove line" onClick={() => set('items', inv.items.filter((_: any, j: number) => j !== i))} style={{ border: 'none', background: 'none', color: C.faint, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>))}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <button type="button" style={chip} onClick={() => set('items', [...inv.items, { description: '', qty: 1, amount: '' }])}>+ Line</button>
                {QUICK.map(([l, desc]) => <button key={l} type="button" style={chip} onClick={() => set('items', [...inv.items.filter((x: any) => x.description || x.amount), { description: desc, qty: 1, amount: '' }])}>+ {l}</button>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + C.row, fontSize: 15 }}><b>Total</b><b>{money(total, inv.currency)}</b></div>
            </div>
            <div style={card}><label style={label}>Note on this invoice (optional)</label><textarea style={{ ...input, resize: 'vertical' }} rows={2} value={inv.note || ''} onChange={e => set('note', e.target.value)} placeholder="e.g. Covers November 2026 to January 2027" /></div>
            <div style={{ ...card, fontSize: 12.5 }}><b style={{ fontSize: 13.5 }}>Fixed on every invoice</b><div style={{ color: C.muted, marginTop: 2 }}>Logo, contact details, bank details, signature and the terms note come from Invoice settings{isAdmin ? ' (you can change them there).' : ' — only admins can change them.'}</div></div>
          </fieldset>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {!locked && <button style={btn('ghost')} disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : inv.id ? 'Save changes' : 'Save draft'}</button>}
              {inv.id && <button style={btn('ghost')} onClick={async () => { if (dirty) await save(true); downloadPdf(inv.id, inv.number) }}>Download PDF</button>}
              {!locked && <button style={{ ...btn('gold'), background: '#191815', borderColor: '#191815' }} disabled={sending} onClick={send}>{sending ? 'Sending…' : inv.sent_at ? 'Send again' : 'Send invoice'}</button>}
              {isAdmin && inv.id && ['sent', 'overdue'].includes(inv.shown_status) && <button style={btn('gold')} onClick={() => act('paid')}>Mark paid</button>}
              {isAdmin && inv.status === 'paid' && <button style={btn('ghost')} onClick={() => act('unpaid')}>Mark unpaid</button>}
              {inv.id && inv.status === 'draft' && <button style={btn('danger')} onClick={() => { if (confirm('Delete this draft?')) act('delete') }}>Delete draft</button>}
              {isAdmin && inv.id && inv.status === 'sent' && <button style={btn('danger')} onClick={() => { if (confirm('Void this invoice? The client will no longer be able to open it.')) act('void') }}>Void</button>}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.1em', color: C.goldDark, marginBottom: 8 }}>LIVE PREVIEW — WHAT {String(inv.bill_to_name || 'THE CLIENT').toUpperCase()} RECEIVES</div>
            <Scaled><InvoiceView inv={inv} s={s} status={inv.status} /></Scaled>
          </div>
        </div>
      </Body>
    </CrmPage>
  )
}

function Scaled({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), [k, setK] = useState(.72)
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setK(Math.min(1, el.clientWidth / 794))); ro.observe(el); return () => ro.disconnect() }, [])
  return <div ref={ref} style={{ width: '100%', maxWidth: 794 }}><div style={{ width: 794 * k, height: 1123 * k, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.12)', borderRadius: 4, background: '#fff' }}><div style={{ transform: `scale(${k})`, transformOrigin: 'top left', width: 794 }}>{children}</div></div></div>
}

function PersonPicker({ inv, onPick }: { inv: any; onPick: (p: any) => void }) {
  const [q, setQ] = useState(''), [res, setRes] = useState<any[]>([]), [open, setOpen] = useState(false)
  const search = useCallback(async (t: string) => { if (t.trim().length < 2) { setRes([]); return } try { const r = await staffApi('/api/invoices?people=' + encodeURIComponent(t)); setRes(r.people) } catch { setRes([]) } }, [])
  useEffect(() => { const h = setTimeout(() => search(q), 250); return () => clearTimeout(h) }, [q, search])
  return (
    <div style={{ position: 'relative' }}>
      <input style={input} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={inv.bill_to_name ? `Change from ${inv.bill_to_name}…` : 'Search a tenant, owner, partner, client or contact'} />
      {open && res.length > 0 && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid ' + C.border, borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 280, overflowY: 'auto', marginTop: 4 }}>
        {res.map((p, i) => <button key={i} type="button" onClick={() => { onPick(p); setQ(''); setRes([]); setOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderBottom: '1px solid #F2F2F2', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{p.name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{p.label}{p.address ? ` · ${p.address}` : ''}{p.phone ? ` · ${p.phone}` : ''}</div></button>)}
      </div>}
    </div>
  )
}

function SettingsModal({ s, onClose, onSaved }: { s: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ ...s }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  async function upload(file: File | undefined, key: string) {
    if (!file) return
    const path = `invoices/${key}-${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await supabase.storage.from('crm-files').upload(path, file, { contentType: file.type })
    if (error) { setErr(error.message); return }
    set(key, supabase.storage.from('crm-files').getPublicUrl(path).data.publicUrl)
  }
  const T = (k: string, l: string, rows = 3) => <div><label style={label}>{l}</label><textarea style={{ ...input, resize: 'vertical' }} rows={rows} value={f[k] || ''} onChange={e => set(k, e.target.value)} /></div>
  const I = (k: string, l: string) => <div><label style={label}>{l}</label><input style={input} value={f[k] ?? ''} onChange={e => set(k, e.target.value)} /></div>
  return (
    <Modal title="Invoice settings — the fixed parts" onClose={onClose} width={620}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12.5, color: C.muted }}>These appear on every invoice. Staff can’t change them.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>{I('company_name', 'Company name')}{I('logo_line1', 'Logo text line 1')}{I('logo_line2', 'Logo text line 2')}</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{f.logo_url && <img src={f.logo_url} alt="" style={{ width: 56, height: 56, objectFit: 'contain', background: '#C9A24A' }} />}<div><label style={label}>Logo</label><input type="file" accept="image/png,image/jpeg" onChange={e => upload(e.target.files?.[0], 'logo_url')} /></div></div>
        {T('contact_lines', 'Contact lines (top right — one per line)', 4)}
        {T('payment_instructions', 'Payment instructions (bank details — one per line)', 5)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>{I('signature_name', 'Signature (typed)')}<div><label style={label}>Or signature image (PNG, clear background)</label><input type="file" accept="image/png" onChange={e => upload(e.target.files?.[0], 'signature_url')} />{f.signature_url && <button type="button" style={{ ...btn('ghost', true), marginTop: 6 }} onClick={() => set('signature_url', '')}>Use typed signature</button>}</div></div>
        {T('terms_note', 'Terms note (bottom of the invoice)', 3)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 10 }}>{I('prefix', 'Number prefix')}{I('next_number', 'Next number')}{I('reply_to', 'Replies go to (email)')}</div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button style={btn('ghost')} onClick={onClose}>Cancel</button><button style={btn('gold')} disabled={busy} onClick={async () => { setBusy(true); try { await staffApi('/api/invoices', { action: 'settings', ...f }); onSaved() } catch (e: any) { setErr(e.message); setBusy(false) } }}>{busy ? 'Saving…' : 'Save'}</button></div>
      </div>
    </Modal>
  )
}
const td: React.CSSProperties = { padding: '11px 16px', verticalAlign: 'top', color: C.ink }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: '14px 16px' }
const chip: React.CSSProperties = { padding: '4px 10px', border: '1px dashed #C9B891', borderRadius: 20, fontSize: 12, color: '#8E6B1F', fontWeight: 600, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }
