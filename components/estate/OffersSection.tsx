'use client'
// Estate Agency sales side: offers and negotiations on properties for sale.
// Offers received from buyers, offers you submit for a buyer, counteroffers, approval and outcome.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'
import { startSaleFromOffer } from '@/lib/estate-sales'

const STATUSES = ['Received', 'Submitted', 'Counteroffer', 'Negotiating', 'Accepted', 'Rejected', 'Withdrawn']
const FILTERS = ['All', 'Received', 'Submitted', 'Counteroffer', 'Negotiating', 'Accepted', 'Rejected']
const COLOUR: Record<string, [string, string]> = {
  Accepted: ['#D1FAE5', '#059669'], Rejected: ['#FEE2E2', '#B42318'], Withdrawn: ['#F2F4F7', '#667085'],
  Counteroffer: ['#FEF3C7', '#92400E'], Negotiating: ['#FEF3C7', '#92400E'],
}
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ property_id: '', contact_id: '', direction: 'received', amount: '', counter_amount: '', status: 'Received', approval: 'Not needed', conditions: '', offer_date: today(), valid_until: '', notes: '' })

export default function OffersSection({ properties }: { properties: any[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState<any>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const [o, c] = await Promise.all([
      supabase.from('estate_offers').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('estate_contacts').select('id,name,kind').eq('user_id', uid).eq('kind', 'buyer').order('name'),
    ])
    setRows(o.data ?? []); setPeople(c.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const prop = (id: string) => properties.find(p => p.id === id)
  const money = (n: any, pid?: string) => (n == null ? '' : (CURRENCIES[prop(pid || '')?.currency || 'JMD'] ?? CURRENCIES.JMD).symbol + Number(n).toLocaleString())

  async function save() {
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter the offer amount'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const num = (v: any) => (v === '' || v == null ? null : Number(v))
    const body = {
      property_id: form.property_id || null, contact_id: form.contact_id || null, direction: form.direction,
      amount: Number(form.amount), counter_amount: num(form.counter_amount), status: form.status, approval: form.approval,
      conditions: form.conditions || null, offer_date: form.offer_date || today(), valid_until: form.valid_until || null, notes: form.notes || null,
    }
    const res = editId ? await supabase.from('estate_offers').update(body).eq('id', editId) : await supabase.from('estate_offers').insert([{ ...body, user_id: uid }])
    if (res.error) { setErr(res.error.message); return }
    setOpen(false); setEditId(null); setForm(blank()); load()
  }
  async function setField(id: string, patch: any) { await supabase.from('estate_offers').update(patch).eq('id', id); load() }
  async function startSale(r: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const msg = await startSaleFromOffer(r, await getAccountId(user))
    if (msg) alert(msg); else alert('Sale started. Open Sales Progression to follow its steps.')
  }
  async function remove(id: string) { if (!confirm('Delete this offer?')) return; await supabase.from('estate_offers').delete().eq('id', id); load() }

  const shown = rows.filter(r => filter === 'All' || r.status === filter)
  const open_ = rows.filter(r => ['Received', 'Submitted', 'Counteroffer', 'Negotiating'].includes(r.status)).length
  const pending = rows.filter(r => r.approval === 'Pending').length

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: filter === f ? '1px solid ' + ACCENT : '1px solid #E4E7EC', background: filter === f ? '#DCE9F8' : '#F7F8FA', color: filter === f ? '#1D4E89' : '#344054' }}>{f}</button>
          ))}
        </div>
        <button onClick={() => { setEditId(null); setForm(blank()); setOpen(true) }} style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add offer</button>
      </div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>{open_} open offers{pending > 0 ? ` · ${pending} waiting for approval` : ''}</div>
      {open && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{editId ? 'Edit offer' : 'Add offer'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={lbl}>Property</label>
              <select style={inp} value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                <option value="">Choose a property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}{p.for_sale ? ' (for sale)' : ''}</option>)}
              </select></div>
            <div><label style={lbl}>Buyer</label>
              <select style={inp} value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">Not listed</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label style={lbl}>Direction</label>
              <select style={inp} value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value, status: e.target.value === 'submitted' && form.status === 'Received' ? 'Submitted' : form.status })}>
                <option value="received">Received from a buyer</option><option value="submitted">Submitted for a buyer</option>
              </select></div>
            <div><label style={lbl}>Offer amount *</label><input type="number" style={inp} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={lbl}>Counteroffer</label><input type="number" style={inp} value={form.counter_amount} onChange={e => setForm({ ...form, counter_amount: e.target.value })} /></div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Approval</label>
              <select style={inp} value={form.approval} onChange={e => setForm({ ...form, approval: e.target.value })}>{['Not needed', 'Pending', 'Approved'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Offer date</label><input type="date" style={inp} value={form.offer_date} onChange={e => setForm({ ...form, offer_date: e.target.value })} /></div>
            <div><label style={lbl}>Valid until</label><input type="date" style={inp} value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={lbl}>Conditions</label><input style={inp} value={form.conditions} placeholder="e.g. subject to survey, chain-free" onChange={e => setForm({ ...form, conditions: e.target.value })} /></div>
          <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Save changes' : 'Add offer'}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
        : shown.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No offers yet</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(r => {
            const [bg, fg] = COLOUR[r.status] ?? ['#EAF3FC', ACCENT]
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{prop(r.property_id)?.name ?? 'No property'}</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                    {r.direction === 'received' ? 'From ' : 'For '}{people.find(p => p.id === r.contact_id)?.name ?? 'a buyer'} · {r.offer_date}{r.valid_until ? ` · valid until ${r.valid_until}` : ''}
                  </div>
                  {r.conditions && <div style={{ fontSize: 12, color: '#667085' }}>{r.conditions}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{money(r.amount, r.property_id)}</div>
                  {r.counter_amount != null && <div style={{ fontSize: 12, color: '#92400E' }}>Counter {money(r.counter_amount, r.property_id)}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: bg, color: fg }}>{r.status}</span>
                {r.approval === 'Pending' && <button onClick={() => setField(r.id, { approval: 'Approved' })} style={{ fontSize: 12, color: '#059669', background: '#fff', border: '1px solid #059669', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Approve</button>}
                {r.approval === 'Approved' && <span style={{ fontSize: 11, color: '#059669' }}>Approved</span>}
                {['Received', 'Submitted', 'Counteroffer', 'Negotiating'].includes(r.status) && <>
                  <button onClick={() => setField(r.id, { status: 'Accepted' })} style={{ fontSize: 12, color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>Accept</button>
                  <button onClick={() => setField(r.id, { status: 'Rejected' })} style={{ fontSize: 12, color: '#B42318', background: 'none', border: 'none', cursor: 'pointer' }}>Reject</button>
                </>}
                {r.status === 'Accepted' && <button onClick={() => startSale(r)} style={{ fontSize: 12, color: '#fff', background: '#059669', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Start sale</button>}
                <button onClick={() => { setEditId(r.id); setForm({ property_id: r.property_id || '', contact_id: r.contact_id || '', direction: r.direction, amount: r.amount ?? '', counter_amount: r.counter_amount ?? '', status: r.status, approval: r.approval, conditions: r.conditions || '', offer_date: r.offer_date || today(), valid_until: r.valid_until || '', notes: r.notes || '' }); setOpen(true) }}
                  style={{ fontSize: 12, color: '#344054', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            )
          })}
        </div>}
    </div>
  )
}
