'use client'
// Estate Agency sales side: buyers, sellers and applicants (people looking to buy or rent).
// One list per kind from estate_contacts. Leads still live in Staff Centre, CRM; this is for
// people you are actively dealing with.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'

export type ContactKind = 'buyer' | 'seller' | 'applicant' | 'corporate'
const STATUSES = ['New', 'Active', 'Viewing', 'Offer made', 'On hold', 'Closed']
const LABEL: Record<ContactKind, string> = { buyer: 'Buyers', seller: 'Sellers', applicant: 'Applicants', corporate: 'Corporate clients' }
const HELP: Record<ContactKind, string> = {
  buyer: 'People looking to buy, with their budget and where they are in the process.',
  seller: 'People selling a property through you, linked to the property.',
  applicant: 'People applying to rent, with their budget and where they are in the process.',
  corporate: 'Companies you deal with, such as employers renting for staff or investors buying in a company name.',
}
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const blank = { name: '', email: '', phone: '', budget_min: '', budget_max: '', property_id: '', source: '', status: 'New', notes: '' }

export default function ContactsSection({ kind, properties }: { kind: ContactKind; properties: any[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>(blank)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const { data } = await supabase.from('estate_contacts').select('*').eq('user_id', uid).eq('kind', kind).order('created_at', { ascending: false })
    setRows(data ?? []); setLoading(false)
  }
  useEffect(() => { setLoading(true); setOpen(false); setEditId(null); load() /* eslint-disable-next-line */ }, [kind])

  async function save() {
    if (!form.name.trim()) { setErr('Enter a name'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const num = (v: any) => (v === '' || v == null ? null : Number(v))
    const body = {
      name: form.name.trim(), email: form.email || null, phone: form.phone || null,
      budget_min: num(form.budget_min), budget_max: num(form.budget_max),
      property_id: form.property_id || null, source: form.source || null, status: form.status, notes: form.notes || null,
    }
    const res = editId
      ? await supabase.from('estate_contacts').update(body).eq('id', editId)
      : await supabase.from('estate_contacts').insert([{ ...body, kind, user_id: uid }])
    if (res.error) { setErr(res.error.message); return }
    setOpen(false); setEditId(null); setForm(blank); load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this record?')) return
    await supabase.from('estate_contacts').delete().eq('id', id)
    load()
  }
  const shown = rows.filter(r => !q || [r.name, r.email, r.phone].some((v: string) => (v || '').toLowerCase().includes(q.toLowerCase())))
  const propName = (id: string) => properties.find(p => p.id === id)?.name

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${LABEL[kind].toLowerCase()}`} style={{ ...inp, maxWidth: 280 }} />
        <button onClick={() => { setEditId(null); setForm(blank); setOpen(true) }} style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          + Add {kind}
        </button>
      </div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>{HELP[kind]}</div>
      {open && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{editId ? 'Edit' : 'Add'} {kind}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={lbl}>{kind === 'corporate' ? 'Company name *' : 'Name *'}</label><input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            {kind !== 'seller' && <div><label style={lbl}>Budget from</label><input type="number" style={inp} value={form.budget_min} onChange={e => setForm({ ...form, budget_min: e.target.value })} /></div>}
            {kind !== 'seller' && <div><label style={lbl}>Budget up to</label><input type="number" style={inp} value={form.budget_max} onChange={e => setForm({ ...form, budget_max: e.target.value })} /></div>}
            <div><label style={lbl}>{kind === 'seller' ? 'Property for sale' : 'Property of interest'}</label>
              <select style={inp} value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                <option value="">None</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label style={lbl}>Source</label><input style={inp} value={form.source} placeholder="e.g. Rightmove, referral" onChange={e => setForm({ ...form, source: e.target.value })} /></div>
            <div><label style={lbl}>Status</label>
              <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 70 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Save changes' : `Add ${kind}`}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
        : shown.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No {LABEL[kind].toLowerCase()} yet</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{[r.email, r.phone].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              {(r.budget_min != null || r.budget_max != null) && <div style={{ fontSize: 13, color: '#344054' }}>{[r.budget_min, r.budget_max].map(v => (v != null ? Number(v).toLocaleString() : '…')).join(' – ')}</div>}
              {r.property_id && <div style={{ fontSize: 13, color: '#667085' }}>{propName(r.property_id) ?? ''}</div>}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#EAF3FC', color: ACCENT }}>{r.status}</span>
              <button onClick={() => { setEditId(r.id); setForm({ name: r.name, email: r.email || '', phone: r.phone || '', budget_min: r.budget_min ?? '', budget_max: r.budget_max ?? '', property_id: r.property_id || '', source: r.source || '', status: r.status, notes: r.notes || '' }); setOpen(true) }}
                style={{ fontSize: 12, color: '#344054', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>}
    </div>
  )
}
