'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Feed = {
  id: string
  property_id: string
  platform: string
  ical_url: string
  last_synced: string | null
  properties?: { name: string }
}

const PLATFORMS = [
  { value: 'Airbnb', label: 'Airbnb', color: '#FF5A5F', bg: '#FFF0F0' },
  { value: 'VRBO', label: 'VRBO', color: '#1C5BD9', bg: '#EEF2FF' },
  { value: 'Booking.com', label: 'Booking.com', color: '#003580', bg: '#EEF4FF' },
  { value: 'Other', label: 'Other', color: '#6B7280', bg: '#F3F4F6' },
]

export default function IntegrationsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ property_id: '', platform: 'Airbnb', ical_url: '' })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ id: string; imported: number; skipped: number } | null>(null)

  useEffect(() => { fetchFeeds(); fetchProperties() }, [])

  async function fetchFeeds() {
    const { data } = await supabase
      .from('ical_feeds')
      .select('*, properties(name)')
      .order('created_at', { ascending: false })
    if (data) setFeeds(data as Feed[])
  }

  async function fetchProperties() {
    const { data } = await supabase.from('properties').select('id, name')
    if (data) setProperties(data)
  }

  async function handleSave() {
    if (!form.property_id || !form.ical_url) return
    setSaving(true)
    await supabase.from('ical_feeds').insert([form])
    setSaving(false)
    setShowModal(false)
    setForm({ property_id: '', platform: 'Airbnb', ical_url: '' })
    fetchFeeds()
  }

  async function syncFeed(feed: Feed) {
    setSyncing(feed.id)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync-ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ical_url: feed.ical_url,
          property_id: feed.property_id,
          platform: feed.platform,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await supabase.from('ical_feeds').update({ last_synced: new Date().toISOString() }).eq('id', feed.id)
        setSyncResult({ id: feed.id, imported: data.imported, skipped: data.skipped })
        fetchFeeds()
      }
    } catch (err) {
      console.error(err)
    }
    setSyncing(null)
  }

  async function deleteFeed(id: string) {
    if (!confirm('Remove this integration?')) return
    await supabase.from('ical_feeds').delete().eq('id', id)
    setFeeds(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>Integrations</h1>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            + Add Integration
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        {/* Platform logos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {PLATFORMS.map(p => (
            <div key={p.value} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>
                {p.value === 'Airbnb' ? '🏠' : p.value === 'VRBO' ? '🏡' : p.value === 'Booking.com' ? '🌐' : '📅'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.label}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {feeds.filter(f => f.platform === p.value).length} connected
              </div>
            </div>
          ))}
        </div>

        {/* Connected feeds */}
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Connected Calendars</h2>

        {feeds.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 48, textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No integrations yet</div>
            <div style={{ fontSize: 14 }}>Add an iCal link from Airbnb, VRBO or Booking.com</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feeds.map(feed => {
              const plt = PLATFORMS.find(p => p.value === feed.platform) ?? PLATFORMS[3]
              const result = syncResult?.id === feed.id ? syncResult : null
              return (
                <div key={feed.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: plt.color, background: plt.bg }}>{plt.label}</span>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{feed.properties?.name ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{feed.ical_url.slice(0, 50)}…</div>
                      {feed.last_synced && (
                        <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>
                          ✓ Last synced {new Date(feed.last_synced).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {result && (
                        <div style={{ fontSize: 11, color: '#2563EB', marginTop: 4 }}>
                          ✓ Imported {result.imported} bookings, skipped {result.skipped}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => syncFeed(feed)}
                      disabled={syncing === feed.id}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: syncing === feed.id ? 0.6 : 1 }}
                    >
                      {syncing === feed.id ? 'Syncing…' : '↻ Sync'}
                    </button>
                    <button onClick={() => deleteFeed(feed.id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Add iCal Integration</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>Paste your iCal link from Airbnb, VRBO or Booking.com to sync bookings automatically.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Property *</label>
                <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} style={inp}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Platform *</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} style={inp}>
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>iCal URL *</label>
                <input type="url" value={form.ical_url} onChange={e => setForm({ ...form, ical_url: e.target.value })} style={inp} placeholder="https://www.airbnb.com/calendar/ical/..." />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  Airbnb: Listing → Availability → Export Calendar<br />
                  VRBO: Listing → Calendar → Import/Export<br />
                  Booking.com: Property → Calendar → iCal Export
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.property_id || !form.ical_url} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Add Integration'}
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
