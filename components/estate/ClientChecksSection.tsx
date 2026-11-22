'use client'
// Estate Agency compliance: AML, proof of funds and ID checks on buyers, sellers and applicants.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'

const KINDS = ['AML', 'Proof of funds', 'ID']
const STATUSES = ['Pending', 'Passed', 'Failed', 'Needs review']
const COLOUR: Record<string, [string, string]> = { Passed: ['#D1FAE5', '#059669'], Failed: ['#FEE2E2', '#B42318'], 'Needs review': ['#FEF3C7', '#92400E'] }
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const blank = () => ({ contact_id: '', kind: 'AML', status: 'Pending', checked_date: '', expiry_date: '', source_of_funds: '', amount_verified: '', reference: '', notes: '' })

export default function ClientChecksSection() {
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
    const [a, b] = await Promise.all([
      supabase.from('estate_client_checks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('estate_contacts').select('id,name,kind').eq('user_id', uid).order('name'),
    ])
    setRows(a.data ?? []); setPeople(b.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.contact_id) { setErr('Choose the person this check is for'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const body = {
      contact_id: form.contact_id, kind: form.kind, status: form.status, checked_date: form.checked_date || null, expiry_date: form.expiry_date || null,
      source_of_funds: form.source_of_funds || null, amount_verified: form.amount_verified === '' ? null : Number(form.amount_verified), reference: form.reference || null, notes: form.notes || null,
    }
    const res = editId ? await supabase.from('estate_client_checks').update(body).eq('id', editId) : await supabase.from('estate_client_checks').insert([{ ...body, user_id: uid }])
    if (res.error) { setErr(res.error.message); return }
    setOpen(false); setEditId(null); setForm(blank()); load()
  }
  async function remove(id: string) { if (!confirm('Delete this check?')) return; await supabase.from('estate_client_checks').delete().eq('id', id); load() }

  const nowIso = new Date().toISOString().slice(0, 10)
  const shown = rows.filter(r => filter === 'All' || r.kind === filter)
  const expired = rows.filter(r => r.expiry_date && r.expiry_date < nowIso).length
  const who = (id: string) => people.find(p => p.id === id)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {['All', ...KINDS].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: filter === f ? '1px solid ' + ACCENT : '1px solid #E4E7EC', background: filter === f ? '#DCE9F8' : '#F7F8FA', color: filter === f ? '#1D4E89' : '#344054' }}>{f}</button>
          ))}
        </div>
        <button onClick={() => { setEditId(null); setForm(blank()); setOpen(true) }} style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add check</button>
      </div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>
        {rows.filter(r => r.status === 'Passed').length} passed · {rows.filter(r => r.status === 'Pending' || r.status === 'Needs review').length} to deal with{expired > 0 ? ` · ${expired} expired` : ''}
      </div>
      {open && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{editId ? 'Edit check' : 'Add check'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={lbl}>Person *</label>
              <select style={inp} value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">Choose a buyer, seller or applicant</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
              </select></div>
            <div><label style={lbl}>Check</label><select style={inp} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label style={lbl}>Result</label><select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label style={lbl}>Checked on</label><input type="date" style={inp} value={form.checked_date} onChange={e => setForm({ ...form, checked_date: e.target.value })} /></div>
            <div><label style={lbl}>Expires</label><input type="date" style={inp} value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div><label style={lbl}>Reference</label><input style={inp} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
            {form.kind === 'Proof of funds' && <div><label style={lbl}>Amount verified</label><input type="number" style={inp} value={form.amount_verified} onChange={e => setForm({ ...form, amount_verified: e.target.value })} /></div>}
            {form.kind !== 'ID' && <div><label style={lbl}>Source of funds</label><input style={inp} value={form.source_of_funds} placeholder="e.g. savings, sale of property" onChange={e => setForm({ ...form, source_of_funds: e.target.value })} /></div>}
          </div>
          <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Save changes' : 'Add check'}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
        : shown.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No checks yet</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(r => {
            const [bg, fg] = COLOUR[r.status] ?? ['#EAF3FC', ACCENT]
            const old = r.expiry_date && r.expiry_date < nowIso
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{who(r.contact_id)?.name ?? 'Unknown'} <span style={{ fontWeight: 400, color: '#667085' }}>· {r.kind}</span></div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                    {[r.checked_date && `Checked ${r.checked_date}`, r.expiry_date && `expires ${r.expiry_date}`, r.source_of_funds, r.amount_verified != null && `Verified ${Number(r.amount_verified).toLocaleString()}`, r.reference].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {old && <span style={{ fontSize: 11, fontWeight: 600, color: '#B42318' }}>Expired</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: bg, color: fg }}>{r.status}</span>
                <button onClick={() => { setEditId(r.id); setForm({ contact_id: r.contact_id || '', kind: r.kind, status: r.status, checked_date: r.checked_date || '', expiry_date: r.expiry_date || '', source_of_funds: r.source_of_funds || '', amount_verified: r.amount_verified ?? '', reference: r.reference || '', notes: r.notes || '' }); setOpen(true) }}
                  style={{ fontSize: 12, color: '#344054', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            )
          })}
        </div>}
    </div>
  )
}
