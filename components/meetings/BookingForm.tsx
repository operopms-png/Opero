'use client'
// Public "book a meeting" form (app.sangstersgroup.com/meeting). Sends a
// meeting request to /api/meeting-request; it shows up in Staff Centre →
// Meetings as "New request" and the team contacts the client to book a time.
import { useEffect, useState } from 'react'

const GOLD = '#D0AE4C', GOLD_DARK = '#A8862E', BROWN = '#624920', CREAM = '#FBF4E6', INK = '#323338', MUTED = '#676879', LINE = '#E6E9EF'
const TYPES = ['Phone call', 'Video call', 'In person']
const PARTS = ['Morning', 'Afternoon', 'Evening', 'Any time']

export default function BookingForm({ code }: { code?: string }) {
  const [page, setPage] = useState<any>(null)
  const [err, setErr] = useState('')
  const [f, setF] = useState({ name: '', email: '', phone: '', topic: '', meeting_type: 'Phone call', date: '', part: 'Any time', when_note: '', message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/meeting-request' + (code ? `?code=${encodeURIComponent(code)}` : '')).then(r => r.json())
      .then(d => d.error ? setErr(d.error) : setPage(d.page)).catch(() => setErr('Something went wrong loading this page.'))
  }, [code])

  const today = new Date().toISOString().slice(0, 10)
  const niceDate = f.date ? new Date(f.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const joined = [niceDate, f.part.toLowerCase(), f.when_note].filter(Boolean).join(', ')
  const preferred = joined.charAt(0).toUpperCase() + joined.slice(1)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!f.name.trim() || !f.email.trim()) { setErr('Please add your name and email.'); return }
    setSending(true)
    try {
      const r = await fetch('/api/meeting-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: page?.code, name: f.name, email: f.email, phone: f.phone, topic: f.topic, meeting_type: f.meeting_type, preferred_time: preferred, message: f.message, website: f.website }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || d.error) setErr(d.error || 'Something went wrong — please try again.')
      else setDone(true)
    } catch { setErr('Something went wrong — please try again.') }
    setSending(false)
  }

  const input: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D5D8E0', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: INK, background: '#fff' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: BROWN, margin: '0 0 6px' }
  const chip = (on: boolean): React.CSSProperties => ({ padding: '8px 13px', borderRadius: 20, border: `1px solid ${on ? GOLD_DARK : '#D5D8E0'}`, background: on ? CREAM : '#fff', color: on ? BROWN : INK, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: on ? 600 : 400 })

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${CREAM} 0%, #fff 55%)`, fontFamily: "Figtree, -apple-system, 'Segoe UI', sans-serif", color: INK, padding: '32px 16px 48px', boxSizing: 'border-box' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap'); input:focus,textarea:focus,select:focus{outline:2px solid ${GOLD};outline-offset:0;border-color:${GOLD}}`}</style>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <img src="/logo-192.png" alt="" width={48} height={48} style={{ borderRadius: 10 }} />
          <div style={{ fontSize: 19, fontWeight: 700, color: BROWN }}>Sangsters Group</div>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, boxShadow: '0 10px 30px rgba(98,73,32,.08)', overflow: 'hidden' }}>
          <div style={{ height: 5, background: GOLD }} />
          <div style={{ padding: '26px 24px 28px' }}>
            {err && !page ? <div style={{ color: MUTED, fontSize: 15 }}>{err}</div>
              : !page ? <div style={{ color: MUTED, fontSize: 15 }}>Loading…</div>
              : done ? (
                <div style={{ textAlign: 'center', padding: '18px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: CREAM, color: GOLD_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>✓</div>
                  <h1 style={{ fontSize: 22, color: BROWN, margin: '0 0 8px' }}>Thank you, {f.name.split(' ')[0]}</h1>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, margin: 0 }}>We’ve received your request. A member of our team will be in touch to confirm a time. We’ve also sent a confirmation to <b style={{ color: INK }}>{f.email}</b>.</p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <h1 style={{ fontSize: 24, color: BROWN, margin: '0 0 6px', fontWeight: 700 }}>{page.heading}</h1>
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.55, margin: '0 0 22px' }}>{page.intro}</p>

                  <div style={{ display: 'grid', gap: 14 }}>
                    <div><label style={lbl}>Your name *</label><input style={input} value={f.name} onChange={e => set('name', e.target.value)} autoComplete="name" required /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                      <div><label style={lbl}>Email *</label><input type="email" style={input} value={f.email} onChange={e => set('email', e.target.value)} autoComplete="email" required /></div>
                      <div><label style={lbl}>Phone</label><input type="tel" style={input} value={f.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" /></div>
                    </div>

                    {(page.topics ?? []).length > 0 && <div>
                      <label style={lbl}>What would you like to talk about?</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {page.topics.map((t: string) => <button type="button" key={t} onClick={() => set('topic', f.topic === t ? '' : t)} style={chip(f.topic === t)}>{t}</button>)}
                      </div>
                    </div>}

                    <div>
                      <label style={lbl}>How would you like to meet?</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {TYPES.map(t => <button type="button" key={t} onClick={() => set('meeting_type', t)} style={chip(f.meeting_type === t)}>{t}</button>)}
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>When suits you?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                        <input type="date" min={today} style={input} value={f.date} onChange={e => set('date', e.target.value)} aria-label="Preferred date" />
                        <select style={{ ...input, cursor: 'pointer' }} value={f.part} onChange={e => set('part', e.target.value)} aria-label="Time of day">{PARTS.map(p => <option key={p}>{p}</option>)}</select>
                      </div>
                      <input style={{ ...input, marginTop: 10 }} value={f.when_note} onChange={e => set('when_note', e.target.value)} placeholder="Anything else? e.g. weekdays after 5pm, UK time" />
                    </div>

                    <div><label style={lbl}>Anything we should know?</label><textarea style={{ ...input, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }} value={f.message} onChange={e => set('message', e.target.value)} placeholder="The property, your plans, questions…" /></div>

                    {/* honeypot: hidden from people, bots fill it */}
                    <input tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set('website', e.target.value)} name="website" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />

                    {err && <div style={{ color: '#C62828', fontSize: 14 }}>{err}</div>}
                    <button type="submit" disabled={sending} style={{ padding: '13px 18px', borderRadius: 10, border: 'none', background: GOLD_DARK, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.7 : 1 }}>{sending ? 'Sending…' : 'Request a meeting'}</button>
                    <div style={{ fontSize: 12.5, color: MUTED, textAlign: 'center' }}>We’ll contact you to confirm a time. Prefer to talk now? Call 020 7164 0329.</div>
                  </div>
                </form>
              )}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: MUTED, marginTop: 18 }}><a href="https://www.sangstersgroup.com" style={{ color: GOLD_DARK, textDecoration: 'none' }}>www.sangstersgroup.com</a></div>
      </div>
    </div>
  )
}
