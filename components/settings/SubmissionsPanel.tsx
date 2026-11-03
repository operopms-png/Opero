'use client'
// Settings -> Submissions: report an issue or bug, leave a review or a suggestion. Company updates from us are under System Messages.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type Sub = { id: string; kind: string; title: string; body: string | null; rating: number | null; status: string; reply: string | null; created_at: string }
const KINDS = [
  { k: 'issue', label: 'Report an issue or bug', hint: 'Something is broken or not working as you expect. Say what you clicked and what happened.' },
  { k: 'review', label: 'Leave a review', hint: 'Tell us how Novourq is working for you.' },
  { k: 'suggestion', label: 'Suggest an improvement', hint: 'Something you want it to do, or do better.' },
]
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }

export default function SubmissionsPanel() {
  const [kind, setKind] = useState('issue')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [list, setList] = useState<Sub[]>([])
  const load = () => staffApi<{ submissions: Sub[] }>('/api/submissions').then(d => setList(d.submissions)).catch(() => {})
  useEffect(() => { load() }, [])
  const cur = KINDS.find(x => x.k === kind)!

  async function send() {
    setBusy(true); setErr(''); setMsg('')
    try {
      await staffApi('/api/submissions', { kind, title, body, rating })
      setTitle(''); setBody(''); setRating(0); setMsg('Thank you. We have received it.'); load()
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Submissions</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>Send us an issue, a review or an idea. Company updates from us are under System Messages.</div>
      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 22, marginBottom: 22 }}>
        <div role="group" aria-label="What are you sending" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 16 }}>
          {KINDS.map(x => (
            <button key={x.k} onClick={() => { setKind(x.k); setErr(''); setMsg('') }} aria-pressed={kind === x.k}
              style={{ padding: '10px 14px', borderRadius: 20, textAlign: 'center', border: '1px solid ' + (kind === x.k ? '#2F6DB5' : '#D0D5DD'), background: kind === x.k ? '#2F6DB5' : '#fff', color: kind === x.k ? '#fff' : '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{x.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 14 }}>{cur.hint}</div>
        {kind === 'review' && (
          <div style={{ marginBottom: 14 }}>
            <span style={label}>Your rating</span>
            <div role="radiogroup" aria-label="Star rating" style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}
                  style={{ fontSize: 28, lineHeight: 1, border: 0, background: 'none', cursor: 'pointer', color: n <= rating ? '#F5B301' : '#D0D5DD', padding: 2 }}>★</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sub-title" style={label}>Title</label>
          <input id="sub-title" style={input} value={title} maxLength={140} onChange={e => setTitle(e.target.value)} placeholder={kind === 'issue' ? 'e.g. Rent reminder did not send' : kind === 'review' ? 'e.g. Saves us hours every week' : 'e.g. Add a tenant satisfaction survey'} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sub-body" style={label}>Details</label>
          <textarea id="sub-body" style={{ ...input, resize: 'vertical' }} rows={5} value={body} maxLength={4000} onChange={e => setBody(e.target.value)} placeholder={kind === 'issue' ? 'Which page, what you clicked, what you expected, what happened.' : ''} />
        </div>
        {err && <div role="alert" style={{ color: '#B42318', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        {msg && <div role="status" style={{ color: '#0E7C55', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
        <button onClick={send} disabled={busy || !title.trim()} style={{ background: '#2F6DB5', color: '#fff', border: 0, borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: busy || !title.trim() ? .6 : 1, fontFamily: 'inherit' }}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#323338', margin: '0 0 10px' }}>What you have sent</h3>
      {list.length === 0 ? <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 24, color: '#98A2B3', fontSize: 13 }}>Nothing sent yet. Your submissions and our replies will show here.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(s => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#2F6DB5' }}>{KINDS.find(k => k.k === s.kind)?.label.split(' ').slice(-1)[0] ?? s.kind}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#323338' }}>{s.title}</span>
                {s.rating ? <span aria-label={`${s.rating} out of 5`} style={{ color: '#F5B301', fontSize: 13 }}>{'★'.repeat(s.rating)}</span> : null}
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, background: '#EAF3FC', color: '#1D4E89', padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>{s.status}</span>
              </div>
              {s.body && <div style={{ fontSize: 13, color: '#344054', whiteSpace: 'pre-wrap' }}>{s.body}</div>}
              {s.reply && <div style={{ marginTop: 8, padding: '8px 12px', background: '#F4F9FD', borderLeft: '3px solid #89CFF0', fontSize: 13, color: '#344054' }}><b>Our reply:</b> {s.reply}</div>}
              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 6 }}>{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
