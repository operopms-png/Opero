'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TEMPLATES = [
  { id: 'welcome', label: 'Welcome Message', subject: 'Welcome to {property_name}!', body: 'Hi {guest_name},\n\nWelcome! We\'re excited to host you at {property_name}.\n\nCheck-in: {check_in}\nCheck-out: {check_out}\n\nPlease don\'t hesitate to reach out if you need anything.\n\nBest regards' },
  { id: 'checkin', label: 'Check-in Instructions', subject: 'Your check-in details for {property_name}', body: 'Hi {guest_name},\n\nYour stay at {property_name} begins on {check_in}.\n\nCheck-in time: 3:00 PM\n\nKey collection: [Add instructions here]\n\nWe hope you have a wonderful stay!' },
  { id: 'checkout', label: 'Check-out Reminder', subject: 'Check-out reminder for {property_name}', body: 'Hi {guest_name},\n\nJust a reminder that your check-out is tomorrow, {check_out} by 11:00 AM.\n\nPlease ensure all windows and doors are locked and keys are returned.\n\nThank you for staying with us!' },
  { id: 'review', label: 'Review Request', subject: 'How was your stay at {property_name}?', body: 'Hi {guest_name},\n\nThank you for staying at {property_name}. We hope you had a wonderful time!\n\nWe\'d really appreciate if you could leave us a review.\n\nThank you!' },
]

export default function GuestCommsPage() {
    const [selected, setSelected] = useState(TEMPLATES[0])
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [preview, setPreview] = useState(TEMPLATES[0].body)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: props } = await supabase.from('properties').select('id').eq('user_id', user?.id)
      const safeIds = (props ?? []).map((p: any) => p.id)
      const idsToUse = safeIds.length ? safeIds : ['00000000-0000-0000-0000-000000000000']
      const { data } = await supabase.from('bookings').select('*, properties(name, address)').in('property_id', idsToUse).order('check_in', { ascending: false }).limit(20)
      setBookings(data ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    let text = selected.body
    if (selectedBooking) {
      text = text.replace(/{guest_name}/g, selectedBooking.guest_name ?? 'Guest')
      text = text.replace(/{property_name}/g, selectedBooking.properties?.name ?? 'the property')
      text = text.replace(/{check_in}/g, selectedBooking.check_in ?? '')
      text = text.replace(/{check_out}/g, selectedBooking.check_out ?? '')
    }
    setPreview(text)
  }, [selected, selectedBooking])

  function copyToClipboard() {
    navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#101828' }}>Guest Communications</h1>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Templates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => setSelected(t)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${selected.id === t.id ? '#3B4AFF' : '#E4E7EC'}`, background: selected.id === t.id ? '#EEF0FF' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: selected.id === t.id ? 600 : 400, color: selected.id === t.id ? '#3B4AFF' : '#344054' }}>
                {t.label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Select Booking</div>
            <select value={selectedBooking?.id ?? ''} onChange={e => setSelectedBooking(bookings.find(b => b.id === e.target.value) ?? null)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
              <option value="">Use placeholders</option>
              {bookings.map(b => <option key={b.id} value={b.id}>{b.guest_name ?? 'Guest'} — {b.properties?.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC', padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#101828', marginBottom: 4 }}>{selected.label}</div>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Subject: {selected.subject.replace(/{property_name}/g, selectedBooking?.properties?.name ?? '{property_name}')}</div>
          <textarea value={preview} onChange={e => setPreview(e.target.value)} style={{ width: '100%', minHeight: 240, padding: '14px', borderRadius: 10, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={copyToClipboard} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #D0D5DD', background: copied ? '#D1FAE5' : '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: copied ? '#10B981' : '#344054' }}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            {selectedBooking?.guest_email && (
              <a href={`mailto:${selectedBooking.guest_email}?subject=${encodeURIComponent(selected.subject)}&body=${encodeURIComponent(preview)}`} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#3B4AFF', color: '#fff', fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center', display: 'block' }}>Send via Email</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
