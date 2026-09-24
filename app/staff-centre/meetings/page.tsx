'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'
const DURATIONS = [15, 30, 60]

function statusStyle(status: string) {
  if (status === 'scheduled') return { bg: '#ECFDF5', color: '#10B981', label: 'Scheduled' }
  if (status === 'cancelled') return { bg: '#FEF2F2', color: '#B42318', label: 'Cancelled' }
  return { bg: '#FFFBEB', color: '#B54708', label: 'Awaiting booking' }
}

export default function MeetingsPage() {
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/meetings', { headers: await authHeader() })
    const data = await res.json()
    setMeetings(data.meetings ?? [])
    setLoading(false)
  }

  async function createLink() {
    setCreating(true)
    setError('')
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ title, duration_minutes: duration }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else {
      setShowNew(false)
      setTitle('')
      setDuration(30)
      await load()
    }
    setCreating(false)
  }

  async function cancelMeeting(id: string) {
    await fetch('/api/meetings', {
      method: 'PATCH',
      headers: await authHeader(),
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    await load()
  }

  function copyLink(id: string, token: string) {
    const url = `${window.location.origin}/meet/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 1500)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#101828', margin: '0 0 4px' }}>Meetings</h1>
          <div style={{ fontSize: 13, color: '#667085' }}>Create a scheduling link with a fixed duration -- 15, 30 or 60 minutes -- and send it to whoever's booking time with you.</div>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New meeting link</button>
      </div>

      {showNew && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#101828', marginBottom: 14 }}>New meeting link</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Owner intro call" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }}>Duration</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{ padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${duration === d ? ACCENT : '#D0D5DD'}`, background: duration === d ? '#EEF0FF' : '#fff', color: duration === d ? ACCENT : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{d} min</button>
                ))}
              </div>
            </div>
            <button onClick={createLink} disabled={creating} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: creating ? 0.6 : 1 }}>{creating ? 'Creating…' : 'Create link'}</button>
            <button onClick={() => { setShowNew(false); setError('') }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
          {error && <div style={{ marginTop: 12, fontSize: 13, color: '#F04438', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 80px 130px 1.4fr 140px 110px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', gap: 8 }}>
          <span>Title</span><span>Length</span><span>Status</span><span>Attendee / time</span><span>Link</span><span></span>
        </div>
        {meetings.length === 0 && <div style={{ padding: 24, fontSize: 13, color: '#98A2B3' }}>No meeting links yet -- create one above.</div>}
        {meetings.map(m => {
          const s = statusStyle(m.status)
          return (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 80px 130px 1.4fr 140px 110px', padding: '14px 20px', borderBottom: '1px solid #F2F4F7', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{m.title}</span>
              <span style={{ fontSize: 13, color: '#344054' }}>{m.duration_minutes} min</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 20, padding: '3px 10px', width: 'fit-content' }}>{s.label}</span>
              <span style={{ fontSize: 12, color: '#667085' }}>
                {m.status === 'scheduled' && m.scheduled_at
                  ? `${m.attendee_name} · ${new Date(m.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </span>
              <button onClick={() => copyLink(m.id, m.token)} disabled={m.status === 'cancelled'} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 12, cursor: m.status === 'cancelled' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: m.status === 'cancelled' ? 0.5 : 1 }}>{copiedId === m.id ? 'Copied!' : 'Copy link'}</button>
              {m.status !== 'cancelled' && <button onClick={() => cancelMeeting(m.id)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'none', color: '#B42318', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
