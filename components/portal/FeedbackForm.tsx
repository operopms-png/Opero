'use client'
// Portal → Feedback: a landlord or tenant rates their experience and writes a comment.
// Saved to portal_feedback and shown to the company in Real Estate Intelligence → Landlord Feedback
// or Tenant Feedback. People only ever see their own entries (database policy).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CATS: Record<'landlord' | 'tenant', string[]> = {
  landlord: ['Service overall', 'Communication', 'Reports and statements', 'Payments', 'Property care', 'Other'],
  tenant: ['Service overall', 'Repairs and maintenance', 'Communication', 'The property', 'Moving in or renewal', 'Other'],
}
const STATUS_NOTE: Record<string, string> = { New: 'Sent', Seen: 'Seen by the team', Actioned: 'Acted on' }
const BLUE = '#2F6DB5'

export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }} role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          style={{ border: 'none', background: 'none', padding: 0, cursor: onChange ? 'pointer' : 'default', lineHeight: 0 }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? '#F5A623' : 'none'} stroke={n <= value ? '#F5A623' : '#C7CDD8'} strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 2.8l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7 6.1 20.8l1.2-6.5L2.5 9.7l6.6-.9z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function FeedbackForm({ source, personTable, personId, personName, businessId, propertyName, preview }: {
  source: 'landlord' | 'tenant'
  personTable: 'pm_landlords' | 'estate_landlords' | 'pm_tenants' | 'estate_tenants'
  personId?: string
  personName?: string
  businessId?: string
  propertyName?: string
  preview?: boolean
}) {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState(CATS[source][0])
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [mine, setMine] = useState<any[]>([])

  async function load() {
    if (!personId) return
    const { data } = await supabase.from('portal_feedback').select('*').eq('person_id', personId).order('created_at', { ascending: false })
    setMine(data ?? [])
  }
  useEffect(() => { load() }, [personId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!personId || !businessId || rating < 1) return
    setSending(true); setMsg('')
    const { error } = await supabase.from('portal_feedback').insert({
      user_id: businessId, source, person_table: personTable, person_id: personId,
      person_name: personName ?? null, property_name: propertyName ?? null,
      rating, category, comment: comment.trim() || null,
    })
    setSending(false)
    if (error) { setMsg('Sorry, your feedback could not be sent. Please try again.'); return }
    setRating(0); setComment(''); setMsg('Thank you. Your feedback has been sent to the team.')
    load()
  }

  const field: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1D4E89' }}>{source === 'landlord' ? 'How are we doing as your managing agent?' : 'How is your home and our service?'}</div>
        <div style={{ fontSize: 13, color: '#667085', margin: '4px 0 16px' }}>Your rating and comment go straight to the team. You can leave feedback at any time.</div>
        <div style={{ marginBottom: 14 }}><Stars value={rating} onChange={setRating} /></div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>About</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...field, marginBottom: 12, cursor: 'pointer' }}>
          {CATS[source].map(c => <option key={c}>{c}</option>)}
        </select>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Your comment</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={2000} placeholder="Tell us what went well and what we could do better" style={{ ...field, resize: 'vertical' }} />
        {preview && <div style={{ fontSize: 12, color: '#B54708', marginTop: 8 }}>You are previewing this portal as staff. Feedback can only be sent by the person themselves.</div>}
        {msg && <div style={{ fontSize: 13, color: msg.startsWith('Thank') ? '#067647' : '#B42318', marginTop: 10 }}>{msg}</div>}
        <button onClick={send} disabled={sending || rating < 1 || !personId || !businessId || preview}
          style={{ marginTop: 14, padding: '10px 20px', borderRadius: 8, border: 'none', background: BLUE, color: '#fff', fontSize: 14, fontWeight: 600, cursor: sending || rating < 1 || preview ? 'default' : 'pointer', opacity: sending || rating < 1 || preview ? 0.55 : 1 }}>
          {sending ? 'Sending…' : 'Send feedback'}
        </button>
      </div>

      {mine.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#344054', marginBottom: 8 }}>Your previous feedback</div>
          {mine.map(f => (
            <div key={f.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Stars value={f.rating} size={16} />
                <span style={{ fontSize: 12, color: '#667085' }}>{new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {STATUS_NOTE[f.status] ?? f.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>{f.category}</div>
              {f.comment && <div style={{ fontSize: 13.5, color: '#344054', marginTop: 4, whiteSpace: 'pre-wrap' }}>{f.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
