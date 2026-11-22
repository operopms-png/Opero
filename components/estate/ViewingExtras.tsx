'use client'
// Under each viewing row: confirm the viewing with the prospect and record their feedback afterwards.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const ACCENT = '#2F6DB5'
const small: React.CSSProperties = { fontSize: 12, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }

export default function ViewingExtras({ bk, onChanged }: { bk: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<number>(bk.feedback_rating ?? 0)
  const [interested, setInterested] = useState<string>(bk.interested ?? '')
  const [text, setText] = useState<string>(bk.feedback ?? '')
  const [saving, setSaving] = useState(false)

  const when = bk.scheduled_at ? new Date(bk.scheduled_at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''
  const mail = bk.prospect_email
    ? `mailto:${bk.prospect_email}?subject=${encodeURIComponent('Viewing confirmation' + (bk.estate_properties?.name ? ' – ' + bk.estate_properties.name : ''))}&body=${encodeURIComponent(`Hello ${bk.prospect_name || ''},\n\nThis is to confirm your viewing${bk.estate_properties?.name ? ' of ' + bk.estate_properties.name : ''}${when ? ' on ' + when : ''}.\n\nPlease reply if you need to change the time.\n`)}`
    : ''

  async function confirm() { await supabase.from('estate_viewings').update({ confirmed_at: new Date().toISOString() }).eq('id', bk.id); onChanged() }
  async function saveFeedback() {
    setSaving(true)
    await supabase.from('estate_viewings').update({ feedback_rating: rating || null, interested: interested || null, feedback: text || null }).eq('id', bk.id)
    setSaving(false); setOpen(false); onChanged()
  }
  const hasFeedback = bk.feedback || bk.feedback_rating || bk.interested

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#667085' }}>
        {bk.confirmed_at
          ? <span style={{ color: '#059669', fontWeight: 600 }}>Confirmed {new Date(bk.confirmed_at).toLocaleDateString('en-GB')}</span>
          : <>
            <span>Not confirmed</span>
            <button onClick={confirm} style={{ ...small, color: '#059669', background: '#fff', border: '1px solid #059669' }}>Mark confirmed</button>
          </>}
        {mail && <a href={mail} style={{ ...small, color: ACCENT, border: '1px solid ' + ACCENT, textDecoration: 'none' }}>Email confirmation</a>}
        <button onClick={() => setOpen(!open)} style={{ ...small, color: '#344054', background: '#fff', border: '1px solid #D0D5DD' }}>{hasFeedback ? 'Edit feedback' : 'Add feedback'}</button>
        {hasFeedback && !open && <span style={{ color: '#344054' }}>{[bk.feedback_rating && `${bk.feedback_rating}/5`, bk.interested && `Interested: ${bk.interested}`, bk.feedback].filter(Boolean).join(' · ')}</span>}
      </div>
      {open && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#344054' }}>Rating</span>
          {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setRating(n === rating ? 0 : n)} style={{ ...small, padding: '3px 9px', border: '1px solid ' + (rating >= n ? ACCENT : '#D0D5DD'), background: rating >= n ? '#DCE9F8' : '#fff', color: '#1D4E89' }}>{n}</button>)}
          <select value={interested} onChange={e => setInterested(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 12 }}>
            <option value="">Interested?</option><option>Yes</option><option>Maybe</option><option>No</option>
          </select>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="What they thought" style={{ flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: '1px solid #D0D5DD', fontSize: 13 }} />
          <button onClick={saveFeedback} disabled={saving} style={{ ...small, color: '#fff', background: ACCENT, border: 'none' }}>{saving ? 'Saving…' : 'Save feedback'}</button>
        </div>
      )}
    </div>
  )
}
