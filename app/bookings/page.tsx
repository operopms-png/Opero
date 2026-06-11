
'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'



type Booking = {
  id: string
  property_id: string
  guest_name: string | null
  guest_email: string | null
  check_in: string
  check_out: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | null
  total_amount: number | null
  platform: string | null
  created_at: string
  properties?: { name: string }
}

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: '#10B981', bg: '#D1FAE5' },
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
}

const INITIAL_FORM = {
  property_id: '',
  guest_name: '',
  guest_email: '',
  check_in: '',
  check_out: '',
  status: 'confirmed',
  total_amount: '',
  platform: '',
}

export default function BookingsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchBookings()
    fetchProperties()
  }, [])

  async function fetchBookings() {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*, properties(name)')
      .order('check_in', { ascending: true })
    if (data) setBookings(data as Booking[])
    setLoading(false)
  }

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('id, name')
    if (data) setProperties(data)
  }

  async function handleSave() {
    if (!form.property_id || !form.check_in || !form.check_out) return
    setSaving(true)
    await supabase.from('bookings').insert([{
      ...form,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
    }])
    setSaving(false)
    setShowModal(false)
    setForm(INITIAL_FORM)
    fetchBookings()
  }

  async function deleteBooking(id: string) {
    if (!confirm('Delete this booking?')) return
    await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const nights = (ci: string, co: string) => {
    const diff = new Date(co).getTime() - new Date(ci).getTime()
    return Math.round(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "var(--font, 'Inter', sans-serif)" }}>
      <style>{``}</style>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Bookings</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{bookings.length}</span>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + New Booking
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid',
              borderColor: filter === s ? '#111827' : '#E5E7EB',
              background: filter === s ? '#111827' : '#fff',
              color: filter === s ? '#fff' : '#6B7280',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              textTransform: 'capitalize',
            }}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:12}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div style={{ fontSize: 16, fontWeight: 500 }}>No bookings yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(b => {
              const cfg = STATUS_CONFIG[b.status ?? 'pending'] ?? STATUS_CONFIG['pending']
              return (
                <div key={b.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{b.guest_name ?? 'Unknown Guest'}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{b.properties?.name ?? '—'}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    <div>{new Date(b.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} → {new Date(b.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ color: '#9CA3AF', marginTop: 2 }}>{nights(b.check_in, b.check_out)} nights{b.platform ? ` · ${b.platform}` : ''}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                    {b.total_amount != null ? `£${b.total_amount.toLocaleString()}` : '—'}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                  <button onClick={() => deleteBooking(b.id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>New Booking</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Property *</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} style={inp}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Guest Name</label><input type="text" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} style={inp} placeholder="John Smith" /></div>
              <div><label style={lbl}>Guest Email</label><input type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })} style={inp} placeholder="john@example.com" /></div>
              <div><label style={lbl}>Check In *</label><input type="date" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Check Out *</label><input type="date" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Total Amount (£)</label><input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} style={inp} placeholder="0" /></div>
              <div><label style={lbl}>Platform</label><input type="text" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} style={inp} placeholder="Airbnb, VRBO…" /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.property_id || !form.check_in || !form.check_out} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Add Booking'}
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
