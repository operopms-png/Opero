'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Staff Centre → Maintenance Board, beside an open job: the fix note and cost (the audit trail everyone sees once it is fixed)
// and the invoices partners see. Property Management and Estate Agency jobs only.
type Inv = { id: string; file_url: string; file_name: string | null; amount: number | null; currency: string | null; note: string | null; show_partner: boolean; created_at: string; uploaded_by: string | null }
const TABLE: Record<string, string> = { pm: 'pm_maintenance', estate: 'estate_maintenance' }
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: 'US$', EUR: '€', CAD: 'CA$', AED: 'AED ' }
const box: React.CSSProperties = { border: '1px solid #E4E7EC', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none' }

async function api(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers || {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong')
  return j
}

export default function StaffMaintenanceExtras({ source, id }: { source: 'pm' | 'estate'; id: string }) {
  const [notes, setNotes] = useState(''), [cost, setCost] = useState('')
  const [invs, setInvs] = useState<Inv[]>([])
  const [amount, setAmount] = useState(''), [cur, setCur] = useState('GBP'), [note, setNote] = useState(''), [show, setShow] = useState(true)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('')

  const load = async () => {
    const { data } = await supabase.from(TABLE[source]).select('resolution_notes, cost').eq('id', id).maybeSingle()
    setNotes(data?.resolution_notes ?? ''); setCost(data?.cost != null ? String(data.cost) : '')
    const j = await api(`/api/maintenance-invoices?source=${source}&id=${id}`).catch(() => ({ invoices: [] }))
    setInvs(j.invoices ?? [])
  }
  useEffect(() => { setMsg(''); load() }, [source, id])

  const saveFix = async () => {
    setBusy(true); setMsg('')
    const { error } = await supabase.from(TABLE[source]).update({ resolution_notes: notes || null, cost: cost === '' ? null : Number(cost) }).eq('id', id)
    setBusy(false); setMsg(error ? error.message : 'Saved. Everyone linked to the property sees this once the job is Fixed.')
  }
  const upload = async (file: File) => {
    setBusy(true); setMsg('')
    try {
      const ext = file.name.split('.').pop()
      const path = `maintenance-invoices/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const up = await supabase.storage.from('pm-files').upload(path, file)
      if (up.error) throw up.error
      const url = supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
      await api('/api/maintenance-invoices', { method: 'POST', body: JSON.stringify({ source, id, file_url: url, file_name: file.name, amount, currency: cur, note, show_partner: show }) })
      setAmount(''); setNote(''); await load(); setMsg('Invoice added.')
    } catch (e: any) { setMsg(e.message || 'Upload failed') }
    setBusy(false)
  }
  const toggle = async (i: Inv) => { await api('/api/maintenance-invoices', { method: 'PATCH', body: JSON.stringify({ id: i.id, show_partner: !i.show_partner }) }).catch(() => {}); load() }
  const remove = async (i: Inv) => { await api(`/api/maintenance-invoices?id=${i.id}`, { method: 'DELETE' }).catch(() => {}); load() }

  return (
    <div style={{ position: 'fixed', right: 'min(656px, 100vw)', bottom: 20, width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', zIndex: 901, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, boxShadow: '0 12px 30px rgba(11,27,69,.18)', padding: 16, fontFamily: 'Figtree, Inter, sans-serif', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Fix notes and invoices</div>
      <div style={{ color: '#667085', fontSize: 12, marginBottom: 10 }}>Change the stage on the board. The tenant, landlord and linked partners are emailed when it is reported, started and fixed.</div>
      <label style={{ fontSize: 12, fontWeight: 600 }}>Fix note (shown to everyone when fixed)</label>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...box, resize: 'vertical', margin: '4px 0 8px' }} />
      <label style={{ fontSize: 12, fontWeight: 600 }}>Cost (landlord and partners only)</label>
      <input value={cost} onChange={e => setCost(e.target.value)} inputMode="decimal" style={{ ...box, margin: '4px 0 8px' }} />
      <button disabled={busy} onClick={saveFix} style={{ background: '#1B2F6E', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Save fix note</button>
      <div style={{ borderTop: '1px solid #EEF1F6', margin: '14px 0 10px' }} />
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Invoices</div>
      {invs.map(i => (
        <div key={i.id} style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <a href={i.file_url} target="_blank" rel="noreferrer" style={{ color: '#1B2F6E', fontWeight: 600 }}>{i.note || i.file_name || 'Invoice'}</a>{i.amount != null ? ` · ${SYM[i.currency ?? ''] ?? ''}${Number(i.amount).toFixed(2)}` : ''}
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12 }}>
            <label style={{ cursor: 'pointer' }}><input type="checkbox" checked={i.show_partner} onChange={() => toggle(i)} /> Show to partners</label>
            <button onClick={() => remove(i)} style={{ border: 'none', background: 'none', color: '#B42318', cursor: 'pointer', padding: 0 }}>Remove</button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
        <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount" style={box} />
        <select value={cur} onChange={e => setCur(e.target.value)} style={{ ...box, width: 90 }}>{Object.keys(SYM).map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note, e.g. Electrician" style={{ ...box, marginBottom: 6 }} />
      <label style={{ fontSize: 12, display: 'block', marginBottom: 8 }}><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show to partners</label>
      <label style={{ display: 'inline-block', background: '#EAF1FB', color: '#1B2F6E', borderRadius: 999, padding: '8px 16px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
        Upload invoice (PDF or photo)
        <input type="file" accept=".pdf,image/*" disabled={busy} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      </label>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith('Saved') || msg.startsWith('Invoice') ? '#047857' : '#B42318' }}>{msg}</div>}
    </div>
  )
}
