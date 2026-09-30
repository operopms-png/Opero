'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, MODULE_COLOR, CrmPage, CrmHeader, Body, Group, Row, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'

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
  { key: 'str-owner', module: 'Vacation Rentals', name: 'Owner Portal', url: '/owner-portal', color: MODULE_COLOR.str, live: true },
  { key: 'pm-landlord', module: 'Property Management', name: 'Landlord Portal', url: '/pm-owner-portal', color: MODULE_COLOR.pm, live: true },
  { key: 'pm-tenant', module: 'Property Management', name: 'Tenant Portal', url: '/pm-tenant-portal', color: MODULE_COLOR.pm, live: true },
  { key: 'ea-landlord', module: 'Estate Agency', name: 'Landlord Portal', url: '/estate-owner-portal', color: MODULE_COLOR.ea, live: true },
  { key: 'ea-tenant', module: 'Estate Agency', name: 'Tenant Portal', url: '/estate-tenant-portal', color: MODULE_COLOR.ea, live: true },
  { key: 'dev-investors', module: 'Developments', name: 'Investors Portal', url: '/dev-investor-portal', color: MODULE_COLOR.dev, live: false },
  { key: 'partners', module: 'Partners', name: 'Partners Dashboard', url: '/partners', color: C.goldDark, live: true },
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

  if (loading) return <Loading />

  const Badge = ({ text, bg, fg }: { text: string; bg: string; fg: string }) => (
    <span style={{ width: 30, height: 30, borderRadius: 4, background: bg, color: fg, fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{text}</span>
  )
  const extCols = [
    { k: 'n', l: 'Site', w: 'minmax(220px,1fr)' },
    { k: 'd', l: 'What it is / login', w: 'minmax(260px,1.6fr)' },
    { k: 'o', l: 'Open', w: 150 },
    { k: 'a', l: '', w: 60 },
  ]
  const ownCols = [
    { k: 'n', l: 'Portal', w: 'minmax(220px,1fr)' },
    { k: 'm', l: 'Module', w: 190 },
    { k: 'd', l: 'What you see', w: 'minmax(260px,1.6fr)' },
    { k: 'o', l: 'Open', w: 190 },
  ]
  const cancelAdd = () => { setShowAdd(false); setName(''); setUrl(''); setNote('') }

  return (
    <CrmPage>
      <CrmHeader
        title="Property Portals"
        subtitle="Quick access to the listing sites and MLS accounts staff use for comparables and research, plus every client portal the way a client sees it."
        actions={isOwner ? <button onClick={() => setShowAdd(true)} style={btn('gold')}>+ Add portal</button> : undefined}
      />
      <Body>
        <Group title="Listing sites & MLS" color={C.gold} count={DEFAULT_PORTALS.length + portals.length} cols={extCols}
          right={<span style={{ fontSize: 12, color: C.faint }}>Each opens in a new tab with your own sign-in — these providers don’t allow embedding.</span>}>
          {DEFAULT_PORTALS.map(p => (
            <Row key={p.key} cells={[
              <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Badge text={p.badge} bg={p.badgeBg} fg={p.badgeFg} /><div><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 12, color: C.faint }}>{p.sub}</div></div></div>,
              <span key="d" style={{ fontSize: 13, color: C.muted, width: '100%' }}>{p.desc}</span>,
              <a key="o" href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...btn('gold', true), minWidth: 120, justifyContent: 'center' }}>Open {EXT}</a>,
              '',
            ]} />
          ))}
          {portals.map(p => (
            <Row key={p.id} cells={[
              <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Badge text={initials(p.name)} bg={C.cream} fg={C.goldDark} /><div><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 12, color: C.faint }}>Custom portal</div></div></div>,
              <span key="d" style={{ fontSize: 13, color: C.muted, width: '100%', whiteSpace: 'pre-wrap' }}>{p.note || 'Opens in a new tab.'}</span>,
              <a key="o" href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...btn('gold', true), minWidth: 120, justifyContent: 'center' }}>Open {EXT}</a>,
              isOwner ? <button key="a" onClick={() => removePortal(p.id)} title="Remove" style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button> : '',
            ]} />
          ))}
          {isOwner && (
            <Row cells={[<button key="add" onClick={() => setShowAdd(true)} style={{ border: 'none', background: 'none', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>+ Add portal</button>, '', '', '']} />
          )}
        </Group>

        <Group title="Client portals" color={C.green} count={OUR_PORTALS.length} cols={ownCols}>
          {OUR_PORTALS.map(p => (
            <Row key={p.key} cells={[
              <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Badge text={p.name.charAt(0)} bg={p.color} fg="#fff" /><span style={{ fontWeight: 500 }}>{p.name}</span></div>,
              <span key="m" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 28, padding: '0 10px', borderRadius: 4, background: p.color, color: '#fff', fontSize: 12.5, fontWeight: 500, minWidth: 150 }}>{p.module}</span>,
              <span key="d" style={{ fontSize: 13, color: C.muted, width: '100%' }}>{p.live ? `This module's ${p.name.toLowerCase()} the way a client sees it.` : 'Preview only — the off-plan deposit plan feature this needs isn’t built yet.'}</span>,
              <a key="o" href={p.url} style={{ ...btn(p.live ? 'gold' : 'ghost', true), minWidth: 160, justifyContent: 'center' }}>{p.live ? `Open ${p.name}` : 'Preview'}</a>,
            ]} />
          ))}
        </Group>
      </Body>

      {isOwner && showAdd && (
        <Modal title="Add a portal" onClose={cancelAdd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={lbl}>Name *</label><input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. OnTheMarket" /></div>
            <div><label style={lbl}>URL *</label><input style={inp} value={url} onChange={e => setUrl(e.target.value)} placeholder="www.example.com" /></div>
            <div><label style={lbl}>Login note (optional)</label><input style={inp} value={note} onChange={e => setNote(e.target.value)} placeholder="Shared staff login" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={cancelAdd} style={btn('ghost')}>Cancel</button>
            <button onClick={addPortal} disabled={saving || !name || !url} style={{ ...btn('gold'), opacity: saving || !name || !url ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save portal'}</button>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}

const EXT = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
