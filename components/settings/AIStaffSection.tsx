'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// AI staff on Team Management: each has a job role, what they do, when they hand over to a person,
// and what they can access. Stored in ai_staff (owner-only rows).

type AIStaff = {
  id: string
  name: string
  job_role: string
  responsibilities: string | null
  escalation: string | null
  access: string | null
  status: 'active' | 'not_set_up' | 'paused'
  grok_bot: string | null
}

const STATUS_LABEL: Record<AIStaff['status'], string> = { active: 'Active', not_set_up: 'Not set up', paused: 'Paused' }
const STATUS_COLOR: Record<AIStaff['status'], { bg: string; fg: string }> = {
  active: { bg: '#ECFDF3', fg: '#067647' },
  not_set_up: { bg: '#F2F4F7', fg: '#667085' },
  paused: { bg: '#FFFAEB', fg: '#B54708' },
}

const EMPTY = { name: '', job_role: '', responsibilities: '', escalation: '', access: '', grok_bot: '', status: 'active' as AIStaff['status'] }

export default function AIStaffSection() {
  const [rows, setRows] = useState<AIStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('ai_staff').select('*').order('created_at', { ascending: true })
    if (error) setError(error.message)
    setRows((data ?? []) as AIStaff[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditingId(null); setForm(EMPTY); setError(''); setShowForm(true)
  }

  function openEdit(r: AIStaff) {
    setEditingId(r.id)
    setForm({
      name: r.name, job_role: r.job_role, responsibilities: r.responsibilities ?? '',
      escalation: r.escalation ?? '', access: r.access ?? '', grok_bot: r.grok_bot ?? '', status: r.status,
    })
    setError(''); setShowForm(true)
  }

  async function save() {
    if (!form.name.trim() || !form.job_role.trim()) { setError('Name and job role are needed.'); return }
    setSaving(true); setError('')
    const payload = {
      name: form.name.trim(), job_role: form.job_role.trim(),
      responsibilities: form.responsibilities.trim() || null,
      escalation: form.escalation.trim() || null,
      access: form.access.trim() || null,
      grok_bot: form.grok_bot.trim() || null,
      status: form.status,
    }
    const res = editingId
      ? await supabase.from('ai_staff').update(payload).eq('id', editingId).select('id')
      : await supabase.from('ai_staff').insert(payload).select('id')
    setSaving(false)
    if (res.error) { setError(res.error.message); return }
    setShowForm(false); setEditingId(null); setForm(EMPTY)
    await load()
  }

  async function remove(r: AIStaff) {
    if (!confirm(`Remove ${r.name} (${r.job_role}) from AI staff?`)) return
    const { data, error } = await supabase.from('ai_staff').delete().eq('id', r.id).select('id')
    if (error) { alert(error.message); return }
    if (!data || data.length === 0) { alert('Could not remove this AI staff member. Refresh and try again.'); return }
    setRows(rows.filter(x => x.id !== r.id))
  }

  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#323338', background: '#fff' }
  const label: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }
  const btn: React.CSSProperties = { padding: '6px 11px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1D4E89' }}>AI staff</div>
          <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>AI team members, their job role, and when they must hand over to a person.</div>
        </div>
        <button onClick={openAdd} style={{ ...btn, background: '#2F6DB5', borderColor: '#2F6DB5', color: '#fff' }}>+ Add AI staff</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16, fontSize: 13, color: '#667085' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: '#667085' }}>No AI staff yet. Click Add AI staff.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Name', 'Job role', 'Grok bot', 'Does day to day', 'Hands over to a person', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E4E7EC' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#1D4E89', fontWeight: 600 }}>{r.job_role}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#344054' }}>{r.grok_bot || '—'}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#344054', maxWidth: 260 }}>{r.responsibilities || '—'}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#344054', maxWidth: 260 }}>{r.escalation || '—'}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: STATUS_COLOR[r.status].bg, color: STATUS_COLOR[r.status].fg }}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(r)} style={{ ...btn, marginRight: 6 }}>Edit</button>
                      <button onClick={() => remove(r)} style={btn}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false) }} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(41,47,76,0.25)' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(560px,100vw)', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.15)', padding: 28, overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89', marginBottom: 18 }}>{editingId ? 'Edit AI staff' : 'Add AI staff'}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Name</label>
              <input style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Bennett" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Job role</label>
              <input style={input} value={form.job_role} onChange={e => setForm({ ...form, job_role: e.target.value })} placeholder="e.g. Property Manager" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Grok bot</label>
              <input style={input} value={form.grok_bot} onChange={e => setForm({ ...form, grok_bot: e.target.value })} placeholder="e.g. Sarah Bennett | Property Manager" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Does day to day</label>
              <textarea style={{ ...input, minHeight: 70 }} value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} placeholder="e.g. Checks every property tab daily, answers tenant questions from approved answers" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Hands over to a person</label>
              <textarea style={{ ...input, minHeight: 70 }} value={form.escalation} onChange={e => setForm({ ...form, escalation: e.target.value })} placeholder="e.g. Money, notices, Right to Rent, complaints, safety, anyone asking for a person" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Access</label>
              <input style={input} value={form.access} onChange={e => setForm({ ...form, access: e.target.value })} placeholder="e.g. Property Operations only" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Status</label>
              <select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as AIStaff['status'] })}>
                <option value="active">Active</option>
                <option value="not_set_up">Not set up</option>
                <option value="paused">Paused</option>
              </select>
            </div>

            {error && <div style={{ fontSize: 13, color: '#B42318', marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={save} disabled={saving} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2F6DB5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
