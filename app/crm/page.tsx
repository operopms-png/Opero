'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Contact = {
  id: string
  type: 'guest' | 'owner' | 'lead'
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string | null
  notes: string | null
  created_at: string
  last_seen: string | null
  booking_count?: number
  total_spent?: number
  property_name?: string | null
}

type Activity = {
  id: string
  contact_id: string
  type: 'note' | 'email' | 'call' | 'booking'
  body: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  guest:  { label: 'Guest',  color: '#5B7BF8', bg: '#EEF2FF' },
  owner:  { label: 'Owner',  color: '#10B981', bg: '#D1FAE5' },
  lead:   { label: 'Lead',   color: '#F59E0B', bg: '#FEF3C7' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active:   { color: '#10B981', bg: '#D1FAE5' },
  inactive: { color: '#6B7280', bg: '#F3F4F6' },
  vip:      { color: '#8B5CF6', bg: '#EDE9FE' },
  prospect: { color: '#F59E0B', bg: '#FEF3C7' },
}

const INITIAL_FORM = {
  type: 'guest',
  name: '',
  email: '',
  phone: '',
  source: '',
  status: 'active',
  notes: '',
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#5B7BF8','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color + '20', border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'guest' | 'owner' | 'lead'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => { fetchContacts() }, [])

  async function fetchContacts() {
    setLoading(true)
    // Try to get contacts from crm_contacts table first
    const { data: crmData } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (crmData && crmData.length > 0) {
      setContacts(crmData as Contact[])
    } else {
      // Fall back to building contacts from bookings + owners
      const [{ data: bookings }, { data: owners }] = await Promise.all([
        supabase.from('bookings').select('guest_name, guest_email, created_at, total_amount, properties(name)').not('guest_name', 'is', null),
        supabase.from('owners').select('*').catch(() => ({ data: [] })),
      ])

      const guestMap: Record<string, Contact> = {}
      for (const b of (bookings ?? [])) {
        const key = b.guest_email ?? b.guest_name
        if (!key) continue
        if (!guestMap[key]) {
          guestMap[key] = {
            id: `g-${key}`,
            type: 'guest',
            name: b.guest_name ?? 'Unknown',
            email: b.guest_email ?? null,
            phone: null,
            source: 'Booking',
            status: 'active',
            notes: null,
            created_at: b.created_at,
            last_seen: b.created_at,
            booking_count: 0,
            total_spent: 0,
            property_name: (b.properties as any)?.name ?? null,
          }
        }
        guestMap[key].booking_count! += 1
        guestMap[key].total_spent! += b.total_amount ?? 0
      }

      const ownerContacts: Contact[] = (owners ?? []).map((o: any) => ({
        id: o.id,
        type: 'owner',
        name: o.name ?? o.full_name ?? 'Owner',
        email: o.email ?? null,
        phone: o.phone ?? null,
        source: 'Owner Portal',
        status: 'active',
        notes: null,
        created_at: o.created_at,
        last_seen: null,
        booking_count: 0,
        total_spent: 0,
        property_name: o.property_name ?? null,
      }))

      setContacts([...ownerContacts, ...Object.values(guestMap)])
    }
    setLoading(false)
  }

  async function fetchActivities(contactId: string) {
    const { data } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    setActivities(data ?? [])
  }

  function selectContact(c: Contact) {
    setSelected(c)
    fetchActivities(c.id)
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    const { data, error } = await supabase.from('crm_contacts').insert([form]).select().single()
    if (!error && data) {
      setContacts(prev => [data as Contact, ...prev])
      setShowModal(false)
      setForm(INITIAL_FORM)
    }
    setSaving(false)
  }

  async function handleAddNote() {
    if (!newNote.trim() || !selected) return
    setAddingNote(true)
    await supabase.from('crm_activities').insert([{
      contact_id: selected.id,
      type: 'note',
      body: newNote.trim(),
    }])
    setNewNote('')
    fetchActivities(selected.id)
    setAddingNote(false)
  }

  const filtered = contacts.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: contacts.length,
    guests: contacts.filter(c => c.type === 'guest').length,
    owners: contacts.filter(c => c.type === 'owner').length,
    leads: contacts.filter(c => c.type === 'lead').length,
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function fmtTime(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', color: '#101828', outline: 'none' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#101828' }}>CRM</h1>
          <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 12.5, fontWeight: 500 }}>{contacts.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`https://app.hubspot.com/contacts/51357725`} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            HubSpot
          </a>
          <button onClick={() => setShowModal(true)}
            style={{ background: '#101828', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add Contact
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>

        {/* Left panel */}
        <div style={{ width: selected ? 360 : '100%', borderRight: selected ? '1px solid #E5E7EB' : 'none', display: 'flex', flexDirection: 'column', background: '#fff', transition: 'width 0.2s' }}>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #F2F4F7' }}>
            {[
              { label: 'Total', value: stats.total, color: '#5B7BF8' },
              { label: 'Guests', value: stats.guests, color: '#5B7BF8' },
              { label: 'Owners', value: stats.owners, color: '#10B981' },
              { label: 'Leads', value: stats.leads, color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{ padding: '14px 20px', borderRight: '1px solid #F2F4F7' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: '#98A2B3', fontWeight: 500, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F2F4F7', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts…"
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#101828' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'guest', 'owner', 'lead'] as const).map(t => (
                <button key={t} onClick={() => setFilter(t)} style={{
                  padding: '6px 12px', borderRadius: 20, border: '1px solid',
                  borderColor: filter === t ? '#101828' : '#E5E7EB',
                  background: filter === t ? '#101828' : '#fff',
                  color: filter === t ? '#fff' : '#6B7280',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#98A2B3', fontSize: 13 }}>Loading contacts…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D0D5DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>No contacts found</div>
                <button onClick={() => setShowModal(true)} style={{ marginTop: 12, padding: '8px 16px', background: '#5B7BF8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Contact</button>
              </div>
            ) : filtered.map(c => {
              const typeCfg = TYPE_CONFIG[c.type]
              const statCfg = STATUS_CONFIG[c.status ?? 'active'] ?? STATUS_CONFIG.active
              const isActive = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => selectContact(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', background: isActive ? '#F5F7FF' : '#fff', transition: 'background 0.1s' }}>
                  <Avatar name={c.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 10, color: typeCfg.color, background: typeCfg.bg, flexShrink: 0 }}>{typeCfg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#98A2B3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email ?? c.phone ?? c.property_name ?? 'No contact info'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {c.booking_count != null && c.booking_count > 0 && (
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5B7BF8' }}>{c.booking_count} booking{c.booking_count > 1 ? 's' : ''}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: '#C1C9D2', marginTop: 1 }}>{fmtTime(c.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — contact detail */}
        {selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8F9FA', overflowY: 'auto' }}>

            {/* Contact header */}
            <div style={{ background: '#fff', padding: '24px 28px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar name={selected.name} size={52} />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', marginBottom: 4 }}>{selected.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, color: TYPE_CONFIG[selected.type].color, background: TYPE_CONFIG[selected.type].bg }}>{TYPE_CONFIG[selected.type].label}</span>
                      {selected.status && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, color: (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.active).color, background: (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.active).bg, textTransform: 'capitalize' }}>{selected.status}</span>}
                      {selected.source && <span style={{ fontSize: 11, color: '#98A2B3', padding: '2px 9px', borderRadius: 10, background: '#F3F4F6' }}>{selected.source}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
              </div>

              {/* Contact info row */}
              <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5B7BF8', textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {selected.email}
                  </a>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', textDecoration: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.9z"/></svg>
                    {selected.phone}
                  </a>
                )}
                {selected.property_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    {selected.property_name}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#98A2B3' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Added {fmtDate(selected.created_at)}
                </span>
              </div>

              {/* Stats row if guest */}
              {selected.type === 'guest' && (selected.booking_count ?? 0) > 0 && (
                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                  <div style={{ padding: '10px 16px', background: '#F5F7FF', borderRadius: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#5B7BF8' }}>{selected.booking_count}</div>
                    <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>Bookings</div>
                  </div>
                  <div style={{ padding: '10px 16px', background: '#F0FDF4', borderRadius: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>£{(selected.total_spent ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>Total spent</div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes section */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#101828', marginBottom: 14 }}>Notes & Activity</div>

              {/* Add note */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 14, marginBottom: 16 }}>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', color: '#101828', resize: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}
                    style={{ padding: '7px 16px', background: '#101828', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: !newNote.trim() ? 0.4 : 1 }}>
                    {addingNote ? 'Saving…' : 'Add note'}
                  </button>
                </div>
              </div>

              {/* Activity list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.notes && (
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Note</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{selected.notes}</div>
                  </div>
                )}
                {activities.length === 0 && !selected.notes ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#98A2B3', fontSize: 13 }}>No activity yet</div>
                ) : (
                  activities.map(a => (
                    <div key={a.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5B7BF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{a.type}</span>
                        <span style={{ fontSize: 11, color: '#98A2B3', marginLeft: 'auto' }}>{fmtTime(a.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{a.body}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, margin: '0 16px' }}>
            <h2 style={{ margin: '0 0 22px', fontSize: 17, fontWeight: 600, color: '#101828' }}>Add Contact</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} placeholder="Jane Smith" />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                  <option value="guest">Guest</option>
                  <option value="owner">Owner</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="vip">VIP</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} placeholder="jane@example.com" />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} placeholder="+44 7700 900000" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Source</label>
                <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={inp} placeholder="Airbnb, Referral, Direct…" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, resize: 'vertical' } as any} rows={3} placeholder="Any additional notes…" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
