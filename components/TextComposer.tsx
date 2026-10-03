'use client'
// Send a text (SMS) from the portal's Twilio number. Used by the Inbox
// ("New text") and by Text buttons on people across the portal.
//   <TextButton phone="+1876…" name="Mr. Campbell" />
//   <TextModal phone? name? onClose onSent />
// Sends through /api/sms/send; replies land in Inbox → Texts.
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const INK = '#191815', GOLD = '#A8862E', MUTED = '#676879', LINE = '#E6E9EF', BORDER = '#D0D4E4'
// "Mr. Campbell" stays formal; "Andrea Brown" → "Andrea"
const first = (n?: string | null) => { const t = (n || '').trim(); if (!t) return ''; const m = t.match(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+(.+)$/i); return m ? `${m[1]}. ${m[2].split(/\s+/).pop()}` : t.split(/\s+/)[0] }
export const TEXT_TEMPLATES: { k: string; l: string; t: (name: string) => string }[] = [
  { k: 'hello', l: 'Introduction', t: n => `Hi${n ? ' ' + n : ''}, this is Sangsters Group. Thanks for getting in touch — when is a good time to talk?` },
  { k: 'viewing', l: 'Viewing reminder', t: n => `Hi${n ? ' ' + n : ''}, a reminder of your viewing with Sangsters Group. Reply YES to confirm or let us know if you need to change the time.` },
  { k: 'rent', l: 'Rent reminder', t: n => `Hi${n ? ' ' + n : ''}, a friendly reminder that your rent is due soon. Reply here if you have any questions. — Sangsters Group` },
  { k: 'checkin', l: 'Check-in details', t: n => `Hi${n ? ' ' + n : ''}, we're looking forward to welcoming you. Your check-in details will follow shortly — reply here if you need anything. — Sangsters` },
  { k: 'callback', l: 'Missed you', t: n => `Hi${n ? ' ' + n : ''}, we tried to reach you. Please call or text us back when you're free. — Sangsters Group` },
]

async function auth() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
}

export function TextModal({ phone, name, onClose, onSent }: { phone?: string | null; name?: string | null; onClose: () => void; onSent?: (contactPhone: string) => void }) {
  const [to, setTo] = useState(phone || '')
  const [who, setWho] = useState(name || '')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const segs = body.length <= 160 ? 1 : Math.ceil(body.length / 153)

  async function send() {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/sms/send', { method: 'POST', headers: await auth(), body: JSON.stringify({ to, body, contact_name: who || undefined }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not send the text')
      setDone(true); onSent?.(d.contact_phone)
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }
  const inp: React.CSSProperties = { width: '100%', height: 38, padding: '0 11px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(25,24,21,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: 'Figtree, Inter, -apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 480, maxWidth: '100%', boxShadow: '0 20px 50px rgba(0,0,0,.25)', borderTop: `3px solid ${GOLD}`, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{done ? 'Text sent' : 'New text'}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{done ? 'Replies come into Inbox → Texts.' : 'Sent from the Sangsters texting number. Replies come into Inbox → Texts.'}</div>
        </div>
        {done ? (
          <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <a href="/staff-centre/inbox" style={{ height: 36, padding: '0 16px', borderRadius: 8, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>Open Inbox</a>
            <button onClick={onClose} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: INK, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
          </div>
        ) : (
          <div style={{ padding: '18px 22px', display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 12.5, color: MUTED, display: 'block', marginBottom: 4 }}>Mobile number</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="+1 876… or +44 7…" style={inp} autoFocus={!phone} /></div>
              <div><label style={{ fontSize: 12.5, color: MUTED, display: 'block', marginBottom: 4 }}>Name (optional)</label><input value={who} onChange={e => setWho(e.target.value)} style={inp} /></div>
            </div>
            <div>
              <label style={{ fontSize: 12.5, color: MUTED, display: 'block', marginBottom: 6 }}>Start from</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEXT_TEMPLATES.map(t => <button key={t.k} type="button" onClick={() => setBody(t.t(first(who)))} style={{ padding: '5px 11px', borderRadius: 20, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#344054', cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>)}
              </div>
            </div>
            <div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} autoFocus={!!phone} placeholder="Write your text…" style={{ ...inp, height: 'auto', padding: '10px 11px', resize: 'vertical', lineHeight: 1.5 }} />
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, textAlign: 'right' }}>{body.length} characters · {segs} text{segs === 1 ? '' : 's'}</div>
            </div>
            {err && <div style={{ fontSize: 13, color: '#B42318' }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={send} disabled={busy || !to.trim() || !body.trim()} style={{ height: 36, padding: '0 18px', borderRadius: 8, border: 'none', background: INK, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !to.trim() || !body.trim() ? .55 : 1 }}>{busy ? 'Sending…' : 'Send text'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function TextButton({ phone, name, style }: { phone?: string | null; name?: string | null; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)} title={phone ? `Text ${name || phone}` : 'Send a text'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#344054', cursor: 'pointer', fontFamily: 'inherit', ...style }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></svg>Text
    </button>
    {open && <TextModal phone={phone} name={name} onClose={() => setOpen(false)} />}
  </>
}
