'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type TeamMember = {
  id: string
  name: string
  email: string | null
  role: string | null
  phone: string | null
}

const ROLES = ['cleaner', 'maintenance', 'manager', 'inspector', 'admin']
const INITIAL_FORM = { name: '', email: '', role: 'cleaner', phone: '' }

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('team_members').select('*').eq('user_id', user.id).order('name')
    if (data) setMembers(data)
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editId) {
      const { error } = await supabase.from('team_members').update({ ...form }).eq('id', editId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('team_members').insert([{ ...form, user_id: user?.id }])
      if (error) { alert(error.message); setSaving(false); return }
    }
    setSaving(false)
    setShowModal(false)
    setForm(INITIAL_FORM)
    setEditId(null)
    fetchMembers()
  }

  async function deleteMember(id: string) {
    if (!confirm('Remove this team member?')) return
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const ROLE_COLOR: Record<string, string> = {
    cleaner: '#10B981', maintenance: '#F59E0B', manager: '#5B7BF8',
    inspector: '#8B5CF6', admin: '#EF4444',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: "var(--font, 'Inter', sans-serif)" }}>
      <style>{``}</style>
      <div style={{ background: '#fff', borderBottom: '1px solid #E8ECF4', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#0F172A' }}>Team Members</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{members.length}</span>
          </div>
          <button onClick={() => { setEditId(null); setForm(INITIAL_FORM); setShowModal(true) }} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Add Member
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <div style={{ fontSize: 16, fontWeight: 500 }}>No team members yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add your cleaners, maintenance staff and managers</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {members.map(m => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8ECF4', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: ROLE_COLOR[m.role ?? 'cleaner'] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {m.role === 'cleaner' ? 'C' : m.role === 'maintenance' ? 'M' : m.role === 'manager' ? 'Mg' : m.role === 'inspector' ? 'I' : 'A'}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{m.name}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: ROLE_COLOR[m.role ?? 'cleaner'], background: ROLE_COLOR[m.role ?? 'cleaner'] + '20', textTransform: 'capitalize' }}>{m.role}</span>
                    </div>
                  </div>
                </div>
                {m.email && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>✉️ {m.email}</div>}
                {m.phone && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>📱 {m.phone}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => { setEditId(m.id); setForm({ name: m.name, email: m.email ?? '', role: m.role ?? 'cleaner', phone: m.phone ?? '' }); setShowModal(true) }} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                  <button onClick={() => deleteMember(m.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit Member' : 'Add Team Member'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Full Name *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sarah Johnson" style={inp} /></div>
              <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="sarah@example.com" style={inp} /></div>
              <div><label style={lbl}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 900000" style={inp} /></div>
              <div><label style={lbl}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
