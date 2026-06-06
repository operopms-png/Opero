'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Property = {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  bedrooms: number | null
  bathrooms: number | null
  max_guests: number | null
  status: 'active' | 'inactive' | 'maintenance' | null
  created_at: string
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
  inactive: { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' },
  maintenance: { label: 'Maintenance', color: '#F59E0B', bg: '#FEF3C7' },
}

const INITIAL_FORM = {
  name: '', address: '', city: '', country: '',
  bedrooms: '', bathrooms: '', max_guests: '', status: 'active',
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { fetchProperties() }, [])

  async function fetchProperties() {
    setLoading(true)
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    if (data) setProperties(data as Property[])
    setLoading(false)
  }

  function openCreate() { setEditId(null); setForm(INITIAL_FORM); setShowModal(true) }

  function openEdit(p: Property) {
    setEditId(p.id)
    setForm({ name: p.name ?? '', address: p.address ?? '', city: p.city ?? '', country: p.country ?? '', bedrooms: p.bedrooms?.toString() ?? '', bathrooms: p.bathrooms?.toString() ?? '', max_guests: p.max_guests?.toString() ?? '', status: p.status ?? 'active' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      name: form.name,
      user_id: user?.id,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      max_guests: form.max_guests ? parseInt(form.max_guests) : null,
      status: form.status,
    }
    if (editId) {
      await supabase.from('properties').update(payload).eq('id', editId)
    } else {
      await supabase.from('properties').insert([payload])
    }
    setSaving(false)
    setShowModal(false)
    fetchProperties()
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property?')) return
    await supabase.from('properties').delete().eq('id', id)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase()) ||
    p.country?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🏠</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Properties</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>{properties.length}</span>
          </div>
          <button onClick={openCreate} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>+ Add Property</button>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: 24 }}>
          <input type="text" placeholder="Search properties…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, width: 280, fontFamily: 'inherit', background: '#fff' }} />
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{search ? 'No properties match' : 'No properties yet'}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(p => {
              const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['inactive']
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 48, opacity: 0.3 }}>🏠</span>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{p.name}</div>
                        {(p.city || p.country) && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>📍 {[p.city, p.country].filter(Boolean).join(', ')}</div>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                    </div>
                    {p.address && <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>{p.address}</div>}
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6B7280', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                      {p.bedrooms != null && <span>🛏 {p.bedrooms} bed</span>}
                      {p.bathrooms != null && <span>🚿 {p.bathrooms} bath</span>}
                      {p.max_guests != null && <span>👥 {p.max_guests} guests</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => deleteProperty(p.id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit Property' : 'Add Property'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Property Name *</label><input type="text" placeholder="e.g. Villa Rosso" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Address</label><input type="text" placeholder="Street address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>City</label><input type="text" placeholder="e.g. Brighton" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Country</label><input type="text" placeholder="e.g. United Kingdom" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Bedrooms</label><input type="number" min="0" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Bathrooms</label><input type="number" min="0" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Max Guests</label><input type="number" min="1" value={form.max_guests} onChange={e => setForm({ ...form, max_guests: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Property'}
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