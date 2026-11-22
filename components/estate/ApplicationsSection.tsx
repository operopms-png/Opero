'use client'
// Estate Agency lettings: rental applications, each with a referencing checklist
// (employer and landlord references, credit, affordability, guarantor, right to rent).
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'

const STAGES = ['Applied', 'Referencing', 'Approved', 'Rejected', 'Withdrawn', 'Tenancy created']
const REF = ['Not started', 'Requested', 'Passed', 'Failed']
const CHECKS: [string, string, string[]][] = [
  ['employer_ref', 'Employer reference', REF], ['landlord_ref', 'Previous landlord reference', REF], ['credit_check', 'Credit check', REF],
  ['affordability', 'Affordability', REF], ['guarantor', 'Guarantor', ['Not needed', ...REF]], ['right_to_rent', 'Right to rent', REF],
]
const ACCENT = '#2F6DB5'
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }
const COLOUR: Record<string, [string, string]> = { Approved: ['#D1FAE5', '#059669'], 'Tenancy created': ['#D1FAE5', '#059669'], Rejected: ['#FEE2E2', '#B42318'], Withdrawn: ['#F2F4F7', '#667085'], Referencing: ['#FEF3C7', '#92400E'] }
const dot = (v: string) => (v === 'Passed' ? '#059669' : v === 'Failed' ? '#B42318' : v === 'Requested' ? '#B45309' : v === 'Not needed' ? '#98A2B3' : '#D0D5DD')
const blank = () => ({ contact_id: '', property_id: '', stage: 'Applied', monthly_rent: '', holding_deposit: '', holding_deposit_paid: false, move_in_date: '', notes: '' })

export default function ApplicationsSection({ properties }: { properties: any[] }) {
  const [rows, setRows] = useState<any[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState<any>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const [a, b] = await Promise.all([
      supabase.from('estate_applications').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('estate_contacts').select('id,name,kind').eq('user_id', uid).in('kind', ['applicant', 'corporate']).order('name'),
    ])
    setRows(a.data ?? []); setPeople(b.data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const prop = (id: string) => properties.find(p => p.id === id)
  const sym = (pid: string) => (CURRENCIES[prop(pid)?.currency || 'JMD'] ?? CURRENCIES.JMD).symbol
  async function patch(id: string, p: any) { await supabase.from('estate_applications').update(p).eq('id', id); load() }

  async function save() {
    if (!form.contact_id) { setErr('Choose the applicant (add them in Applicants first)'); return }
    setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = await getAccountId(user)
    const num = (v: any) => (v === '' || v == null ? null : Number(v))
    const body = { contact_id: form.contact_id, property_id: form.property_id || null, stage: form.stage, monthly_rent: num(form.monthly_rent), holding_deposit: num(form.holding_deposit), holding_deposit_paid: !!form.holding_deposit_paid, move_in_date: form.move_in_date || null, notes: form.notes || null }
    const res = editId ? await supabase.from('estate_applications').update(body).eq('id', editId) : await supabase.from('estate_applications').insert([{ ...body, user_id: uid }])
    if (res.error) { setErr(res.error.message); return }
    setOpen(false); setEditId(null); setForm(blank()); load()
  }
  async function remove(id: string) { if (!confirm('Delete this application?')) return; await supabase.from('estate_applications').delete().eq('id', id); load() }

  const shown = rows.filter(r => filter === 'All' || r.stage === filter)
  const progress = (r: any) => { const rel = CHECKS.filter(([k]) => r[k] !== 'Not needed'); return `${rel.filter(([k]) => r[k] === 'Passed').length} of ${rel.length} checks passed` }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {['All', ...STAGES].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: filter === f ? '1px solid ' + ACCENT : '1px solid #E4E7EC', background: filter === f ? '#DCE9F8' : '#F7F8FA', color: filter === f ? '#1D4E89' : '#344054' }}>{f}</button>
          ))}
        </div>
        <button onClick={() => { setEditId(null); setForm(blank()); setOpen(true) }} style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add application</button>
      </div>
      {open && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 14px' }}>{editId ? 'Edit application' : 'Add application'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={lbl}>Applicant *</label>
              <select style={inp} value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">Choose an applicant</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label style={lbl}>Property</label>
              <select style={inp} value={form.property_id} onChange={e => { const p = prop(e.target.value); setForm({ ...form, property_id: e.target.value, monthly_rent: form.monthly_rent || (p?.rent ?? '') }) }}>
                <option value="">Choose a property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label style={lbl}>Stage</label><select style={inp} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Monthly rent</label><input type="number" style={inp} value={form.monthly_rent} onChange={e => setForm({ ...form, monthly_rent: e.target.value })} /></div>
            <div><label style={lbl}>Holding deposit</label><input type="number" style={inp} value={form.holding_deposit} onChange={e => setForm({ ...form, holding_deposit: e.target.value })} /></div>
            <div><label style={lbl}>Move-in date</label><input type="date" style={inp} value={form.move_in_date} onChange={e => setForm({ ...form, move_in_date: e.target.value })} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#344054', marginTop: 12 }}><input type="checkbox" checked={!!form.holding_deposit_paid} onChange={e => setForm({ ...form, holding_deposit_paid: e.target.checked })} /> Holding deposit paid</label>
          <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {err && <div style={{ color: '#B42318', fontSize: 13, marginTop: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editId ? 'Save changes' : 'Add application'}</button>
            <button onClick={() => { setOpen(false); setEditId(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>
        : shown.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 14 }}>No applications yet</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(r => {
            const [bg, fg] = COLOUR[r.stage] ?? ['#EAF3FC', ACCENT]
            const isOpen = openId === r.id
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
                <div onClick={() => setOpenId(isOpen ? null : r.id)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{people.find(p => p.id === r.contact_id)?.name ?? 'Applicant'}</div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{[prop(r.property_id)?.name, r.monthly_rent != null && `${sym(r.property_id)}${Number(r.monthly_rent).toLocaleString()} / month`, r.move_in_date && `move in ${r.move_in_date}`].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>{CHECKS.map(([k, l]) => <span key={k} title={`${l}: ${r[k]}`} style={{ width: 10, height: 10, borderRadius: '50%', background: dot(r[k]) }} />)}</div>
                  <div style={{ fontSize: 12, color: '#667085' }}>{progress(r)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: bg, color: fg }}>{r.stage}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #E4E7EC', padding: 18, background: '#FCFCFD' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 14 }}>
                      {CHECKS.map(([k, l, opts]) => (
                        <label key={k} style={{ fontSize: 12, color: '#344054' }}>{l}
                          <select value={r[k]} onChange={e => patch(r.id, { [k]: e.target.value })} style={{ ...inp, padding: '7px 10px', marginTop: 4, fontSize: 13 }}>{opts.map(o => <option key={o}>{o}</option>)}</select>
                        </label>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ fontSize: 13, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={r.holding_deposit_paid} onChange={e => patch(r.id, { holding_deposit_paid: e.target.checked })} /> Holding deposit {r.holding_deposit != null ? `${sym(r.property_id)}${Number(r.holding_deposit).toLocaleString()} ` : ''}paid</label>
                      {r.stage !== 'Approved' && r.stage !== 'Tenancy created' && <button onClick={() => patch(r.id, { stage: 'Approved' })} style={{ fontSize: 12, color: '#059669', background: '#fff', border: '1px solid #059669', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Approve</button>}
                      {r.stage !== 'Rejected' && <button onClick={() => patch(r.id, { stage: 'Rejected' })} style={{ fontSize: 12, color: '#B42318', background: '#fff', border: '1px solid #B42318', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Reject</button>}
                      <button onClick={() => { setEditId(r.id); setForm({ contact_id: r.contact_id || '', property_id: r.property_id || '', stage: r.stage, monthly_rent: r.monthly_rent ?? '', holding_deposit: r.holding_deposit ?? '', holding_deposit_paid: r.holding_deposit_paid, move_in_date: r.move_in_date || '', notes: r.notes || '' }); setOpen(true) }} style={{ fontSize: 12, color: '#344054', background: '#fff', border: '1px solid #D0D5DD', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => remove(r.id)} style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </div>
                    {r.notes && <div style={{ fontSize: 13, color: '#667085', marginTop: 10 }}>{r.notes}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>}
    </div>
  )
}
