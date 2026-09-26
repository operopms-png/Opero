'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'

const DEFAULT_PORTALS = [
  {
    key: 'rightmove',
    name: 'Rightmove',
    sub: 'UK listings',
    desc: "UK property search & comparables. Opens your Rightmove session in a new tab.",
    url: 'https://www.rightmove.co.uk',
    badge: 'RM',
    badgeBg: '#00DC84',
    badgeFg: '#0B2E1F',
  },
  {
    key: 'zillow',
    name: 'Zillow',
    sub: 'US listings',
    desc: 'US property search & estimates. Opens Zillow in a new tab.',
    url: 'https://www.zillow.com',
    badge: 'Z',
    badgeBg: '#0F6BFF',
    badgeFg: '#FFFFFF',
  },
  {
    key: 'jamaica-mls',
    name: 'Jamaica MLS',
    sub: 'Private Client Services',
    desc: 'Gourzong Realty client portal, board set to Jamaica. Shared staff login.',
    url: 'https://www.privateclientservices.com',
    badge: 'JA',
    badgeBg: '#F2A93B',
    badgeFg: '#3B2400',
  },
]

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || 'PT'
}

// Our own client-facing portals -- opened in the same tab since these
// are internal Opero pages, not external sites. The Developments
// Investors Portal doesn't have real data behind it yet (off-plan
// deposit plans aren't tracked anywhere in the schema yet), so it
// links to a preview page rather than a live portal.
const OUR_PORTALS = [
  { key: 'str-owner', module: 'Vacation Rentals', name: 'Owner Portal', url: '/owner-portal', color: '#3B4AFF', live: true },
  { key: 'pm-landlord', module: 'Property Management', name: 'Landlord Portal', url: '/pm-owner-portal', color: '#10B981', live: true },
  { key: 'pm-tenant', module: 'Property Management', name: 'Tenant Portal', url: '/pm-tenant-portal', color: '#10B981', live: true },
  { key: 'ea-landlord', module: 'Estate Agency', name: 'Landlord Portal', url: '/estate-owner-portal', color: '#F59E0B', live: true },
  { key: 'ea-tenant', module: 'Estate Agency', name: 'Tenant Portal', url: '/estate-tenant-portal', color: '#F59E0B', live: true },
  { key: 'dev-investors', module: 'Developments', name: 'Investors Portal', url: '/dev-investor-portal', color: '#8B5CF6', live: false },
  { key: 'partners', module: 'Partners', name: 'Partners Dashboard', url: '/partners', color: '#C9A84C', live: true },
]

export default function PortalsPage() {
  const [loading, setLoading] = useState(true)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [portals, setPortals] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    // Staff accounts log in with their own auth id, but shared resources
    // like this belong to the business owner's id -- same resolution
    // Sidebar.tsx uses for plan/modules.
    const { data: rows } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
    const resolvedOwnerId = rows?.[0]?.user_id ?? user.id
    setOwnerId(resolvedOwnerId)
    setIsOwner(resolvedOwnerId === user.id)

    const { data: portalRows } = await supabase
      .from('staff_portals')
      .select('*')
      .eq('user_id', resolvedOwnerId)
      .order('created_at', { ascending: true })
    setPortals(portalRows ?? [])
    setLoading(false)
  }

  async function addPortal() {
    if (!name || !url || !ownerId) return
    setSaving(true)
    const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const { data, error } = await supabase
      .from('staff_portals')
      .insert({ user_id: ownerId, name, url: fullUrl, note: note || null })
      .select()
      .single()
    setSaving(false)
    if (error) { alert(error.message); return }
    setPortals(prev => [...prev, data])
    setName(''); setUrl(''); setNote(''); setShowAdd(false)
  }

  async function removePortal(id: string) {
    if (!confirm('Remove this portal?')) return
    await supabase.from('staff_portals').delete().eq('id', id)
    setPortals(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '40px 48px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Portal Access</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#101828', letterSpacing: '-0.01em' }}>Client Portals</h1>
          <div style={{ fontSize: 14, color: '#667085', maxWidth: 640, lineHeight: 1.5 }}>
            View and access every client-facing portal across every module from one place.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, marginBottom: 36 }}>
          {OUR_PORTALS.map(p => (
            <div key={p.key} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: p.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: p.color, flexShrink: 0 }}>{p.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#101828' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>{p.module}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.5, flexGrow: 1 }}>
                {p.live ? `View this module's ${p.name.toLowerCase()} the way a client sees it.` : 'Preview only — the off-plan deposit plan feature this needs isn’t built yet.'}
              </div>
              <a href={p.url} style={{ background: p.live ? p.color : '#F2F4F7', color: p.live ? '#fff' : '#667085', fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                {p.live ? `Open ${p.name}` : 'Preview'}
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>External listings</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#101828', letterSpacing: '-0.01em' }}>Property Portals</h1>
          <div style={{ fontSize: 14, color: '#667085', maxWidth: 640, lineHeight: 1.5 }}>
            Quick access to the listing sites and MLS accounts staff use for comparables and research. Each opens in a new tab with your own sign-in — nothing is embedded, since these providers don't allow it.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, marginBottom: 20 }}>
          {DEFAULT_PORTALS.map(p => (
            <div key={p.key} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: p.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: p.badgeFg, flexShrink: 0 }}>{p.badge}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#101828' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>{p.sub}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.5, flexGrow: 1 }}>{p.desc}</div>
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                Open {p.name}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          ))}

          {portals.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
              {isOwner && (
                <button onClick={() => removePortal(p.id)} title="Remove" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: ACCENT, flexShrink: 0 }}>{initials(p.name)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#101828' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>Custom portal</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.5, flexGrow: 1 }}>{p.note || 'Opens in a new tab.'}</div>
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                Open {p.name}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          ))}
        </div>

        {isOwner && (showAdd ? (
          <div style={{ background: '#fff', border: '1px solid ' + ACCENT, borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 12 }}>Add another portal</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Name</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. OnTheMarket" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>URL</div>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="www.example.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Login note (optional)</div>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Shared staff login" style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addPortal} disabled={saving || !name || !url} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save portal'}</button>
              <button onClick={() => { setShowAdd(false); setName(''); setUrl(''); setNote('') }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#344054' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} style={{ width: '100%', border: '1.5px dashed #D0D5DD', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, color: '#667085', fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add another portal — name, URL and (optionally) shared login
          </button>
        ))}
      </div>
    </div>
  )
}
