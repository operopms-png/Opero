
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'



type Ticket = {
  id: string
  property_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | null
  assigned_to: string | null
  created_at: string
  properties?: { name: string }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#6B7280', bg: '#F3F4F6' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FEF3C7' },
  high: { label: 'High', color: '#EF4444', bg: '#FEE2E2' },
  urgent: { label: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#3B82F6', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bg: '#FEF3C7' },
  resolved: { label: 'Resolved', color: '#10B981', bg: '#D1FAE5' },
  closed: { label: 'Closed', color: '#6B7280', bg: '#F3F4F6' },
}

const INITIAL_FORM = { property_id: '', title: '', description: '', priority: 'medium', status: 'open', assigned_to: '' }

export default function MaintenancePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])

  useEffect(() => { fetchTickets(); fetchProperties() }, [])

  async function fetchTickets() {
    setLoading(true)
    const { data } = await supabase.from('maintenance_tickets').select('*, properties(name)').order('created_at', { ascending: false })
    if (data) setTickets(data as Ticket[])
    setLoading(false)
  }

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('id, name')
    if (data) setProperties(data)
  }

  async function handleSave() {
    if (!form.property_id || !form.title) return
    setSaving(true)
    await supabase.from('maintenance_tickets').insert([{ ...form, assigned_to: form.assigned_to || null, description: form.description || null }])
    setSaving(false)
    setShowModal(false)
    setForm(INITIAL_FORM)
    fetchTickets()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('maintenance_tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: status as Ticket['status'] } : t))
  }

  async function deleteTicket(id: string) {
    if (!confirm('Delete this ticket?')) return
    await supabase.from('maintenance_tickets').delete().eq('id', id)
    setTickets(prev => prev.filter(t => t.id !== id))
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔧</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Maintenance</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{tickets.filter(t => t.status === 'open').length} open</span>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + New Ticket
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid',
              borderColor: filter === s ? '#111827' : '#E5E7EB',
              background: filter === s ? '#111827' : '#fff',
              color: filter === s ? '#fff' : '#6B7280',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>No tickets</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(t => {
              const pri = PRIORITY_CONFIG[t.priority ?? 'medium'] ?? PRIORITY_CONFIG['medium']
              const sta = STATUS_CONFIG[t.status ?? 'open'] ?? STATUS_CONFIG['open']
              return (
                <div key={t.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: pri.color, background: pri.bg, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pri.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      {t.properties?.name ?? '—'}{t.assigned_to ? ` · 👤 ${t.assigned_to}` : ''}{t.description ? ` · ${t.description}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: sta.color, background: sta.bg, whiteSpace: 'nowrap' }}>{sta.label}</span>
                  <select value={t.status ?? 'open'} onChange={e => updateStatus(t.id, e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={() => deleteTicket(t.id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>New Maintenance Ticket</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Property *</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} style={inp}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Title *</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} placeholder="e.g. Boiler not working" /></div>
              <div><label style={lbl}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="More details…" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inp}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div><label style={lbl}>Assigned To</label><input type="text" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={inp} placeholder="Name or email" /></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.property_id || !form.title} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Create Ticket'}
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
