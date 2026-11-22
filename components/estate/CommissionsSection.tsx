'use client'
// Estate Agency finance: sales commission, lettings fees, agency fees and staff commission.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'

const KINDS = ['Sales commission', 'Lettings fee', 'Agency fee', 'Staff commission']
const STATUSES = ['Due', 'Invoiced', 'Paid']
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ kind: 'Sales commission', property_id: '', sale_id: '', agent_name: '', base_amount: '', rate: '', amount: '', status: 'Due', due_date: '', paid_date: '', notes: '' })

export default function CommissionsSection({ properties }: { properties: any[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
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
      supabase.from('estate_commissions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('estate_sales').select('id,property_id,agreed_price').eq('user_id', uid),
    ])
    setRows(a.data ?? []); setSales(b.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const prop = (id: string) => properties.find(p => p.id === id)
  const sym = (pid?: string) => (CURRENCIES[prop(pid || '')?.currency || 'JMD'] ?? CURRENCIES.JMD).symbol
  const money = (n: any, pid?: string) => sym(pid) + Number(n || 0).toLocaleString()
  // base and rate give the amount; you can still type the amount yourself
  function recalc(f: any) {
    const b = Number(f.base_amount), r = Number(f.rate)
    return b > 0 && r > 0 ? { ...f, amount: String(Math.round(b * r) / 100) } : f
  }
  function pickSale(id: string) {
    const s = sales.find(x => x.id === id)
    setForm(recalc({ ...form, sale_id: id, property_id: s?.property_id || form.property_id, base_amount: s?.agreed_price ?? form.base_amount }))
  }

  async function save() {
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter the amount, or a base amount and a rate'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const num = (v: any) => (v === '' || v == null ? null : Number(v))
    const body = {
      kind: form.kind, property_id: form.property_id || null, sale_id: form.sale_id || null, agent_name: form.agent_name || null,
      base_amount: num(form.base_amount), rate: num(form.rate), amount: Number(form.amount), status: form.status,
      due_date: form.due_date || null, paid_date: form.status === 'Paid' ? (form.paid_date || today()) : null, notes: form.notes || null,
    }
    const res = editId ? await supabase.from('estate_commissions').update(body).eq('id', editId) : await supabase.from('estate_commissions').insert([{ ...body, user_id: uid }])
    if (res.error) { setErr(res.error.message); return }
    setOpen(false); setEditId(null); setForm(blank()); load()
  }
  async function markPaid(id: string) { await supabase.from('estate_commissions').update({ status: 'Paid', paid_date: today() }).eq('id', id); load() }
  async function remove(id: string) { if (!confirm('Delete this entry?')) return; await supabase.from('estate_commissions').delete().eq('id', id); load() }

  const shown = rows.filter(r => filter === 'All' || r.kind === filter)
  const sum = (st: string[]) => rows.filter(r => st.includes(r.status)).reduce((t, r) => t + Number(r.amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 14 }}>
        {[['Due or invoiced', sum(['Due', 'Invoiced'])], ['Paid', sum(['Paid'])]].map(([l, v]) => (
          <div key={l as string} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: '#667085', letterSpacing: '.4px', textTransform: 'uppercase' }}>{l as string}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{Number(v).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {['All', ...KINDS].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: filter === f ? '1px solid ' + ACCENT : '1px solid #E4E7EC', background: filter === f ? '#DCE9F8' : '#F7F8FA', color: filter === f ? '#1D4E89' : '#344054' }}>{f}</button>
          ))}
        </div>
        <button onClick={() => { setEditId(null); setForm(blank()); setOpen(true) }} style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add entry</button>
      </div>
      {open && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{editId ? 'Edit entry' : 'Add entry'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={lbl}>Type</label><select style={inp} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label style={lbl}>Sale (optional)</label>
              <select style={inp} value={form.sale_id} onChange={e => pickSale(e.target.value)}>
                <option value="">None</option>
                {sales.map(s => <option key={s.id} value={s.id}>{prop(s.property_id)?.name ?? 'Sale'}</option>)}
              </select></div>
            <div><label style={lbl}>Property</label>
              <select style={inp} value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                <option value="">None</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            {form.kind === 'Staff commission' && <div><label style={lbl}>Agent</label><input style={inp} value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>}
            <div><label style={lbl}>Base amount</label><input type="number" style={inp} value={form.base_amount} onChange={e => setForm(recalc({ ...form, base_amount: e.target.value }))} /></div>
            <div><label style={lbl}>Rate %</label><input type="number" style={inp} value={form.rate} onChange={e => setForm(recalc({ ...form, rate: e.target.value }))} /></div>
            <div><label style={lbl}>Amount *</label><input type="number" style={inp} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label style={lbl}>Status</label><select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label style={lbl}>Due date</label><input type="date" style={inp} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Save changes' : 'Add entry'}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
        : shown.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No entries yet</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{r.kind}{r.agent_name ? ` · ${r.agent_name}` : ''}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                  {[prop(r.property_id)?.name, r.rate != null && `${r.rate}% of ${money(r.base_amount, r.property_id)}`, r.due_date && `due ${r.due_date}`, r.paid_date && `paid ${r.paid_date}`].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{money(r.amount, r.property_id)}</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: r.status === 'Paid' ? '#D1FAE5' : '#FEF3C7', color: r.status === 'Paid' ? '#059669' : '#92400E' }}>{r.status}</span>
              {r.status !== 'Paid' && <button onClick={() => markPaid(r.id)} style={{ fontSize: 12, color: '#059669', background: '#fff', border: '1px solid #059669', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Mark paid</button>}
              <button onClick={() => { setEditId(r.id); setForm({ kind: r.kind, property_id: r.property_id || '', sale_id: r.sale_id || '', agent_name: r.agent_name || '', base_amount: r.base_amount ?? '', rate: r.rate ?? '', amount: r.amount ?? '', status: r.status, due_date: r.due_date || '', paid_date: r.paid_date || '', notes: r.notes || '' }); setOpen(true) }}
                style={{ fontSize: 12, color: '#344054', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>}
    </div>
  )
}
