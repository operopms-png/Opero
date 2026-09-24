'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const ACCENT = '#3B4AFF'

export default function MeetingBookingPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<any>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/meetings/${token}`)
      .then(r => r.json())
      .then(res => {
        if (res.error) setError(res.error)
        else setMeeting(res.meeting)
        setLoading(false)
      })
      .catch(() => { setError('Something went wrong loading this meeting link.'); setLoading(false) })
  }, [token])

  async function handleBook() {
    if (!name || !email || !date || !time) return
    setSubmitting(true)
    setError('')
    try {
      const scheduled_at = new Date(`${date}T${time}`).toISOString()
      const res = await fetch(`/api/meetings/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendee_name: name, attendee_email: email, scheduled_at, notes }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setDone(true)
    } catch {
      setError('Something went wrong booking this meeting -- please try again.')
    }
    setSubmitting(false)
  }

  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, border: '1px solid #E4E7EC', padding: 32, width: '100%', maxWidth: 420 }
  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 5 }

  if (loading) return <div style={wrap}><div style={{ color: '#98A2B3', fontSize: 14 }}>Loading…</div></div>

  if (error && !meeting) return (
    <div style={wrap}><div style={card}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Can't load this link</div>
      <div style={{ fontSize: 14, color: '#667085' }}>{error}</div>
    </div></div>
  )

  if (meeting?.status === 'cancelled') return (
    <div style={wrap}><div style={card}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Meeting cancelled</div>
      <div style={{ fontSize: 14, color: '#667085' }}>This meeting link is no longer active.</div>
    </div></div>
  )

  if (done || meeting?.status === 'scheduled') {
    const when = meeting?.scheduled_at ? new Date(meeting.scheduled_at) : null
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Meeting confirmed</div>
        <div style={{ fontSize: 14, color: '#667085', marginBottom: 4 }}>{meeting.title} · {meeting.duration_minutes} minutes</div>
        {when && <div style={{ fontSize: 14, color: '#344054', fontWeight: 500 }}>{when.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>}
      </div></div>
    )
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', marginBottom: 4 }}>{meeting.title}</div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 24 }}>{meeting.duration_minutes} minute meeting -- pick a time that works for you.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={label}>Your name</label>
            <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label style={label}>Your email</label>
            <input style={input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Date</label>
              <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Time</label>
              <input style={input} type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>Anything to add? (optional)</label>
            <textarea style={{ ...input, minHeight: 60, resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <div style={{ fontSize: 13, color: '#F04438', background: '#FEF3F2', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}
          <button
            onClick={handleBook}
            disabled={submitting || !name || !email || !date || !time}
            style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: submitting || !name || !email || !date || !time ? 0.6 : 1 }}
          >
            {submitting ? 'Booking…' : `Confirm ${meeting.duration_minutes} min meeting`}
          </button>
        </div>
      </div>
    </div>
  )
}
