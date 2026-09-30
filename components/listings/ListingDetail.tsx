'use client'
// One property on the public lettings link (/homes/<id>): photo slider with
// thumbnails and full screen, key facts, description, features, and a
// "Book a viewing" form that goes to Estate Agency → Viewings and the CRM.
import { useState } from 'react'
import PhotoSlider, { Lightbox, BRAND } from './PhotoSlider'
import { TopBar, pageCss, areaOf, inp, lbl } from './ListingsBrowser'
import { money, bedLabel, titleCase, type Listing } from '@/lib/listings-shared'

export default function ListingDetail({ home }: { home: Listing }) {
  const [i, setI] = useState(0)
  const [full, setFull] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const name = titleCase(home.name)
  const avail = home.status === 'now' ? 'Now' : home.available_from ? new Date(home.available_from + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : 'Soon'

  async function share() {
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: name, text: `${name} — ${home.rent ? money(home.rent, home.currency) + ' / month' : 'to rent'}`, url }); return } catch {} }
    await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  const key = (label: string, value: string) => value ? <div style={{ background: '#F7F8FA', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: BRAND.muted }}>{label}<b style={{ display: 'block', color: BRAND.ink, fontSize: 15, marginTop: 2 }}>{value}</b></div> : null
  return (
    <div style={{ fontFamily: "Figtree, -apple-system, 'Segoe UI', sans-serif", color: BRAND.ink, minHeight: '100vh', background: '#fff', overflowX: 'clip' }}>
      <style>{pageCss + `.lst-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:30px} @media (max-width:820px){.lst-grid{grid-template-columns:minmax(0,1fr)}}`}</style>
      <TopBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px 50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
          <a href="/homes" style={{ color: BRAND.gd, textDecoration: 'none', fontSize: 14.5, fontWeight: 600 }}>‹ All homes</a>
          <button onClick={share} style={{ border: `1px solid ${BRAND.line}`, background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: BRAND.ink }}>{copied ? 'Link copied ✓' : '↗ Share'}</button>
        </div>

        <div style={{ borderRadius: 16, overflow: 'hidden' }} className="lst-hero-wrap">
          <PhotoSlider photos={home.photos} height="clamp(250px, 58vw, 460px)" big index={i} onIndex={setI} onOpen={k => setFull(k)}>
            {home.photos.length > 0 && <button onClick={() => setFull(i)} style={{ position: 'absolute', top: 14, right: 14, background: '#fff', border: 'none', borderRadius: 8, padding: '7px 11px', fontSize: 13, fontWeight: 600, color: BRAND.brown, cursor: 'pointer', zIndex: 3, fontFamily: 'inherit' }}>⤢ Full screen</button>}
          </PhotoSlider>
        </div>
        {home.photos.length > 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 0 2px' }}>
            {home.photos.map((p, k) => (
              <button key={k} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} style={{ flex: '0 0 96px', height: 66, borderRadius: 8, border: `2px solid ${k === i ? BRAND.gd : 'transparent'}`, padding: 0, overflow: 'hidden', cursor: 'pointer', background: '#EDE6D8', opacity: k === i ? 1 : 0.8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}

        <div className="lst-grid" style={{ marginTop: 22 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3.4vw, 30px)', color: BRAND.brown }}>{name}</h1>
            <div style={{ color: BRAND.muted, fontSize: 15.5, marginTop: 3 }}>{areaOf(home.address)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, margin: '18px 0' }}>
              {key('Rent', home.rent ? `${money(home.rent, home.currency)} / month` : 'On request')}
              {key('Bedrooms', bedLabel(home.bedrooms).replace(' bed', ''))}
              {key('Bathrooms', home.bathrooms)}
              {key('Available', avail)}
              {key('Type', home.type)}
            </div>
            {home.description
              ? <div style={{ lineHeight: 1.65, color: '#454852', fontSize: 15.5, whiteSpace: 'pre-wrap' }}>{home.description}</div>
              : <div style={{ color: BRAND.muted, fontSize: 15 }}>Get in touch or book a viewing for full details of this property.</div>}
            {home.features.length > 0 && <>
              <h3 style={{ color: BRAND.brown, fontSize: 16, margin: '22px 0 10px' }}>Features</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{home.features.map(f => <span key={f} style={{ border: `1px solid ${BRAND.line}`, borderRadius: 20, padding: '6px 12px', fontSize: 13.5 }}>✓ {f}</span>)}</div>
            </>}
          </div>
          <ViewingForm home={home} />
        </div>
      </div>
      {full !== null && home.photos.length > 0 && <Lightbox photos={home.photos} start={full} onClose={() => setFull(null)} />}
    </div>
  )
}

function ViewingForm({ home }: { home: Listing }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', day: '', part: 'Any time', message: '', website: '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const today = new Date().toISOString().slice(0, 10)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    const day = f.day ? new Date(f.day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
    const t = [day, f.part.toLowerCase()].filter(Boolean).join(', ')
    try {
      const r = await fetch('/api/listings/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'viewing', property_id: home.id, name: f.name, email: f.email, phone: f.phone, preferred_time: t.charAt(0).toUpperCase() + t.slice(1), message: f.message, website: f.website }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || d.error) setErr(d.error || 'Something went wrong — please try again.'); else setDone(true)
    } catch { setErr('Something went wrong — please try again.') }
    setBusy(false)
  }
  return (
    <div style={{ border: `1px solid ${BRAND.line}`, borderRadius: 14, padding: 20, alignSelf: 'start', boxShadow: '0 6px 20px rgba(98,73,32,.07)', position: 'sticky', top: 84, background: '#fff', minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: BRAND.brown }}>{home.rent ? <>{money(home.rent, home.currency)} <span style={{ fontSize: 14, color: BRAND.muted, fontWeight: 500 }}>/ month</span></> : 'Price on request'}</div>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0 6px' }}>
          <div style={{ fontSize: 30, color: BRAND.gd }}>✓</div>
          <div style={{ fontWeight: 700, color: BRAND.brown, fontSize: 18, margin: '4px 0' }}>Request sent</div>
          <div style={{ color: BRAND.muted, fontSize: 14.5, lineHeight: 1.55 }}>Thanks, {f.name.split(' ')[0]}. We’ll be in touch to confirm your viewing and we’ve emailed you a copy.</div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.brown }}>Book a viewing</div>
          <div><label style={lbl}>Your name *</label><input className="lst-in" style={inp} value={f.name} onChange={e => set('name', e.target.value)} required autoComplete="name" /></div>
          <div><label style={lbl}>Email *</label><input className="lst-in" type="email" style={inp} value={f.email} onChange={e => set('email', e.target.value)} required autoComplete="email" /></div>
          <div><label style={lbl}>Phone</label><input className="lst-in" type="tel" style={inp} value={f.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" /></div>
          <div><label style={lbl}>When suits you?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
              <input className="lst-in" type="date" min={today} style={inp} value={f.day} onChange={e => set('day', e.target.value)} aria-label="Preferred day" />
              <select className="lst-in" style={{ ...inp, cursor: 'pointer' }} value={f.part} onChange={e => set('part', e.target.value)} aria-label="Time of day">{['Any time', 'Morning', 'Afternoon', 'Evening'].map(p => <option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div><label style={lbl}>Message</label><textarea className="lst-in" style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={f.message} onChange={e => set('message', e.target.value)} placeholder="Questions, move-in date, who’ll be living there…" /></div>
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set('website', e.target.value)} aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
          {err && <div style={{ color: '#C62828', fontSize: 14 }}>{err}</div>}
          <button disabled={busy} style={{ padding: 13, border: 'none', borderRadius: 10, background: BRAND.gd, color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending…' : 'Request a viewing'}</button>
          <div style={{ textAlign: 'center', color: BRAND.muted, fontSize: 12.5 }}>We’ll contact you to confirm a time · 020 7164 0329</div>
        </form>
      )}
    </div>
  )
}
