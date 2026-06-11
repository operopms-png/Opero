'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

type Property = {
  id: string
  name: string
  slug: string | null
  address: string | null
  city: string | null
  country: string | null
  bedrooms: number | null
  bathrooms: number | null
  max_guests: number | null
  status: 'active' | 'inactive' | 'maintenance' | null
  nightly_rate: number | null
  cleaning_fee: number | null
  image_url: string | null
  description: string | null
  location: string | null
  airbnb_ical_url: string | null
  vrbo_ical_url: string | null
  booking_ical_url: string | null
  created_at: string
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10B981', bg: '#D1FAE5' },
  inactive: { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' },
  maintenance: { label: 'Maintenance', color: '#F59E0B', bg: '#FEF3C7' },
}

const PLAN_LIMITS: Record<string, number> = {
  starter: 5,
  growth: 25,
  professional: Infinity,
}

const INITIAL_FORM = {
  name: '', slug: '', address: '', city: '', country: '',
  bedrooms: '', bathrooms: '', max_guests: '', status: 'active',
  nightly_rate: '', cleaning_fee: '', image_url: '', description: '', location: '',
  airbnb_ical_url: '', vrbo_ical_url: '', booking_ical_url: '',
}

export default function PropertiesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
      if (sub && (sub as any).plan) setPlan((sub as any).plan)
    }
    const { data } = await (supabase as any).from('properties').select('*').order('created_at', { ascending: false })
    if (data) setProperties(data as Property[])
    setLoading(false)
  }

  const propertyLimit = PLAN_LIMITS[plan] ?? 5
  const atLimit = properties.length >= propertyLimit

  function openCreate() {
    if (atLimit) { setShowUpgradeModal(true); return }
    setEditId(null); setForm(INITIAL_FORM); setShowModal(true)
  }

  function openEdit(p: Property) {
    setEditId(p.id)
    setForm({
      name: p.name ?? '', slug: p.slug ?? '', address: p.address ?? '',
      city: p.city ?? '', country: p.country ?? '',
      bedrooms: p.bedrooms?.toString() ?? '', bathrooms: p.bathrooms?.toString() ?? '',
      max_guests: p.max_guests?.toString() ?? '', status: p.status ?? 'active',
      nightly_rate: p.nightly_rate?.toString() ?? '', cleaning_fee: p.cleaning_fee?.toString() ?? '',
      image_url: p.image_url ?? '', description: p.description ?? '', location: p.location ?? '',
      airbnb_ical_url: p.airbnb_ical_url ?? '', vrbo_ical_url: p.vrbo_ical_url ?? '',
      booking_ical_url: p.booking_ical_url ?? '',
    })
    setShowModal(true)
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSave() {
    if (!form.name) return
    if (!editId && atLimit) { setShowModal(false); setShowUpgradeModal(true); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const slug = form.slug || generateSlug(form.name)
    const payload = {
      name: form.name, slug, user_id: user?.id,
      address: form.address || null, city: form.city || null,
      country: form.country || null, location: form.location || null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      max_guests: form.max_guests ? parseInt(form.max_guests) : null,
      status: form.status,
      nightly_rate: form.nightly_rate ? parseFloat(form.nightly_rate) : null,
      cleaning_fee: form.cleaning_fee ? parseFloat(form.cleaning_fee) : null,
      image_url: form.image_url || null,
      description: form.description || null,
      airbnb_ical_url: form.airbnb_ical_url || null,
      vrbo_ical_url: form.vrbo_ical_url || null,
      booking_ical_url: form.booking_ical_url || null,
    }
    if (editId) {
      await (supabase as any).from('properties').update(payload).eq('id', editId)
    } else {
      await (supabase as any).from('properties').insert([payload])
    }
    setSaving(false)
    setShowModal(false)
    await fetchData()
    fetch('/api/sync-ical').then(() => fetchData())
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property?')) return
    await (supabase as any).from('properties').delete().eq('id', id)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  async function syncAllIcal() {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/sync-ical')
      const data = await res.json()
      setSyncMsg(`✅ Synced ${data.synced?.length ?? 0} properties`)
    } catch { setSyncMsg('❌ Sync failed') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  function copyBookingLink(slug: string) {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase()) ||
    p.country?.toLowerCase().includes(search.toLowerCase())
  )

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
  const nextPlan = plan === 'starter' ? 'Growth' : 'Professional'
  const nextPrice = plan === 'starter' ? '£79' : '£199'

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🏠</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Properties</h1>
            <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
              {properties.length}{propertyLimit !== Infinity ? `/${propertyLimit}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {syncMsg && <span style={{ fontSize: 13, color: '#6B7280' }}>{syncMsg}</span>}
            <button onClick={syncAllIcal} disabled={syncing} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
              {syncing ? 'Syncing…' : '🔄 Sync iCal'}
            </button>
            {atLimit && plan !== 'professional' && (
              <a href="/landing.html#pricing" style={{ fontSize: 13, color: '#5B7BF8', fontWeight: 500, textDecoration: 'none' }}>⚡ Upgrade for more</a>
            )}
            <button onClick={openCreate} style={{ background: atLimit ? '#E5E7EB' : '#111827', color: atLimit ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: atLimit ? 'not-allowed' : 'pointer' }}>
              + Add Property
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        {atLimit && plan !== 'professional' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>🚫 You've reached your {planLabel} plan limit of {propertyLimit} properties</div>
              <div style={{ fontSize: 13, color: '#92400E', marginTop: 2, opacity: 0.8 }}>Upgrade to {nextPlan} to add more.</div>
            </div>
            <a href="/landing.html#pricing" style={{ padding: '9px 18px', background: '#F59E0B', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Upgrade to {nextPlan} →</a>
          </div>
        )}

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
              const icalCount = [p.airbnb_ical_url, p.vrbo_ical_url, p.booking_ical_url].filter(Boolean).length
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  <div style={{ height: 160, background: p.image_url ? 'none' : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48, opacity: 0.3 }}>🏠</span>}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{p.name}</div>
                        {(p.city || p.country) && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>📍 {[p.city, p.country].filter(Boolean).join(', ')}</div>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                    </div>
                    {p.nightly_rate && <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>£{p.nightly_rate}<span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>/night</span></div>}
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#6B7280', paddingTop: 10, borderTop: '1px solid #F3F4F6', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {p.bedrooms != null && <span>🛏 {p.bedrooms} bed</span>}
                        {p.bathrooms != null && <span>🚿 {p.bathrooms} bath</span>}
                      </div>
                      {icalCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: '#10B981', background: '#D1FAE5' }}>🔗 {icalCount} iCal{icalCount > 1 ? 's' : ''}</span>}
                    </div>

                    {/* Direct booking link */}
                    {p.slug && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: '#F8FAFF', borderRadius: 8, border: '1px solid #E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#5B7BF8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/book/{p.slug}</span>
                        <button onClick={() => copyBookingLink(p.slug!)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: 'none', background: copiedSlug === p.slug ? '#10B981' : '#5B7BF8', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {copiedSlug === p.slug ? '✓ Copied' : 'Copy link'}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                      {p.slug && <a href={`/book/${p.slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', color: '#374151' }}>Preview</a>}
                      <button onClick={() => deleteProperty(p.id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 600, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit Property' : 'Add Property'}</h2>

            {/* Basic details */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Property Name *</label><input type="text" placeholder="e.g. Aurévo Seacastle" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) }) }} style={inp} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Booking URL slug</label><input type="text" placeholder="e.g. aurevo-seacastle" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={inp} /><div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Your direct booking link: /book/{form.slug || 'your-slug'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Description</label><textarea placeholder="Describe your property…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inp, height: 80, resize: 'vertical' as const }} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Photo URL</label><input type="url" placeholder="https://..." value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={inp} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Address</label><input type="text" placeholder="Street address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>City</label><input type="text" placeholder="e.g. Montego Bay" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Country</label><input type="text" placeholder="e.g. Jamaica" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={inp} /></div>
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

            {/* Pricing */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Nightly Rate (£)</label><input type="number" min="0" placeholder="0" value={form.nightly_rate} onChange={e => setForm({ ...form, nightly_rate: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Cleaning Fee (£)</label><input type="number" min="0" placeholder="0" value={form.cleaning_fee} onChange={e => setForm({ ...form, cleaning_fee: e.target.value })} style={inp} /></div>
            </div>

            {/* iCal */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calendar Sync (iCal)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div><label style={lbl}>🏠 Airbnb iCal URL</label><input type="url" placeholder="https://www.airbnb.com/calendar/ical/..." value={form.airbnb_ical_url} onChange={e => setForm({ ...form, airbnb_ical_url: e.target.value })} onBlur={e => { if (e.target.value) setTimeout(() => fetch('/api/sync-ical').then(() => fetchData()), 500) }} style={inp} /></div>
              <div><label style={lbl}>🏡 VRBO iCal URL</label><input type="url" placeholder="https://www.vrbo.com/icalendar/..." value={form.vrbo_ical_url} onChange={e => setForm({ ...form, vrbo_ical_url: e.target.value })} onBlur={e => { if (e.target.value) setTimeout(() => fetch('/api/sync-ical').then(() => fetchData()), 500) }} style={inp} /></div>
              <div><label style={lbl}>🌐 Booking.com iCal URL</label><input type="url" placeholder="https://ical.booking.com/..." value={form.booking_ical_url} onChange={e => setForm({ ...form, booking_ical_url: e.target.value })} onBlur={e => { if (e.target.value) setTimeout(() => fetch('/api/sync-ical').then(() => fetchData()), 500) }} style={inp} /></div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Property'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={e => e.target === e.currentTarget && setShowUpgradeModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, margin: '0 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Property limit reached</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 8px' }}>Your <strong>{planLabel} plan</strong> allows up to <strong>{propertyLimit} properties</strong>.</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>Upgrade to <strong>{nextPlan} ({nextPrice}/mo)</strong> to add more.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUpgradeModal(false)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <a href="/landing.html#pricing" style={{ flex: 1, padding: '11px', borderRadius: 8, background: '#5B7BF8', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'block' }}>Upgrade to {nextPlan} →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
