
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'



type Turnover = {
  id: string
  property_id: string
  turnover_date: string
  check_out_time: string | null
  check_in_time: string | null
  assigned_to: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | null
  notes: string | null
  created_at: string
  properties?: { name: string }
}

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bg: '#FEF3C7' },
  completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5' },
}

const INITIAL_FORM = { property_id: '', turnover_date: '', check_out_time: '', check_in_time: '', assigned_to: '', status: 'scheduled', notes: '' }

export default function TurnoversPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [turnovers, setTurnovers] = useState<Turnover[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string }[]>([])

  useEffect(() => { fetchTurnovers(); fetchProperties(); fetchTeam() }, [])

  async function fetchTurnovers() {
    setLoading(true)
    const { data } = await supabase.from('turnovers').select('*, properties(name)').order('turnover_date', { ascending: true })
    if (data) setTurnovers(data as Turnover[])
    setLoading(false)
  }

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('id, name')
    if (data) setProperties(data)
  }
  async function fetchTeam() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('team_members').select('id, name, role').eq('user_id', user.id).order('name')
    if (data) setTeamMembers(data)
  }

  async function handleSave() {
    if (!form.property_id || !form.turnover_date) return
    setSaving(true)
    await supabase.from('turnovers').insert([{
      ...form,
      check_out_time: form.check_out_time || null,
      check_in_time: form.check_in_time || null,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
    }])
    setSaving(false)
    setShowModal(false)
    setForm(INITIAL_FORM)
    fetchTurnovers()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('turnovers').update({ status }).eq('id', id)
    setTurnovers(prev => prev.map(t => t.id === id ? { ...t, status: status as Turnover['status'] } : t))
  }

  async function deleteTurnover(id: string) {
    if (!confirm('Delete this turnover?')) return
    await supabase.from('turnovers').delete().eq('id', id)
    setTurnovers(prev => prev.filter(t => t.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = turnovers.filter(t => t.turnover_date >= today)
  const past = turnovers.filter(t => t.turnover_date < today)

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔄</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Turnovers</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{upcoming.length} upcoming</span>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Schedule Turnover
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading turnovers…</div>
        ) : turnovers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>No turnovers scheduled</div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Upcoming</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(t => <TurnoverRow key={t.id} t={t} onStatus={updateStatus} onDelete={deleteTurnover} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Past</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.6 }}>
                  {past.map(t => <TurnoverRow key={t.id} t={t} onStatus={updateStatus} onDelete={deleteTurnover} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>Schedule Turnover</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Property *</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} style={inp}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Date *</label><input type="date" value={form.turnover_date} onChange={e => setForm({ ...form, turnover_date: e.target.value })} style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>Check-out Time</label><input type="time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Check-in Time</label><input type="time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })} style={inp} /></div>
              </div>
              <div>
                <label style={lbl}>Assigned To</label>
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select team member…</option>
                  {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Special instructions…" /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.property_id || !form.turnover_date} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TurnoverRow({ t, onStatus, onDelete }: { t: Turnover; onStatus: (id: string, s: string) => void; onDelete: (id: string) => void }) {
  const cfg = STATUS_CONFIG[t.status ?? 'scheduled'] ?? STATUS_CONFIG['scheduled']
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 4 }}>{t.properties?.name ?? '—'}</div>
        <div style={{ fontSize: 13, color: '#6B7280', display: 'flex', gap: 12 }}>
          <span>📅 {new Date(t.turnover_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          {t.check_out_time && <span>🚪 Out {t.check_out_time}</span>}
          {t.check_in_time && <span>🔑 In {t.check_in_time}</span>}
          {t.assigned_to && <span>👤 {t.assigned_to}</span>}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>{cfg.label}</span>
      <select value={t.status ?? 'scheduled'} onChange={e => onStatus(t.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
        <option value="scheduled">Scheduled</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
      <button onClick={() => onDelete(t.id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
