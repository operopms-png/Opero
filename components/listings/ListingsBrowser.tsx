'use client'
// Public lettings page (app.sangstersgroup.com/homes): every listed property
// as a card with a swipeable photo slider, simple filters, and a
// "Tell us what you need" form for tenants who don't see a match.
import { useMemo, useState } from 'react'
import PhotoSlider, { BRAND } from './PhotoSlider'
import { money, bedLabel, titleCase, type Listing } from '@/lib/listings-shared'

export const areaOf = (address: string) => {
  const parts = address.split(',').map(s => s.trim()).filter(Boolean)
  return titleCase(parts.slice(-2).join(', ') || address)
}
const bedsNum = (b: string) => /studio/i.test(b) ? 0 : parseInt(b) || 0

export function TopBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${BRAND.line}`, background: '#fff', position: 'sticky', top: 0, zIndex: 20 }}>
      <a href="/homes" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: BRAND.brown, fontSize: 17, textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-192.png" alt="" width={38} height={38} style={{ borderRadius: 8 }} />Sangsters Group
      </a>
      <a href="tel:+442071640329" style={{ fontSize: 14, color: BRAND.gd, fontWeight: 600, textDecoration: 'none' }}>020 7164 0329</a>
    </div>
  )
}

export const pageCss = `@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');
body{margin:0;background:#fff} .lst-card{transition:box-shadow .15s, transform .15s} .lst-card:hover{box-shadow:0 10px 28px rgba(98,73,32,.14);transform:translateY(-2px)}
.lst-in:focus{outline:2px solid ${BRAND.gold};outline-offset:0;border-color:${BRAND.gold}}`

export default function ListingsBrowser({ homes }: { homes: Listing[] }) {
  const [area, setArea] = useState('')
  const [beds, setBeds] = useState('')
  const [when, setWhen] = useState('')
  const [sort, setSort] = useState('new')
  const [wanted, setWanted] = useState(false)

  const areas = useMemo(() => Array.from(new Set(homes.map(h => areaOf(h.address)).filter(Boolean))).sort(), [homes])
  const shown = useMemo(() => {
    let list = homes.filter(h => (!area || areaOf(h.address) === area) && (!beds || (beds === 'studio' ? bedsNum(h.bedrooms) === 0 : bedsNum(h.bedrooms) >= Number(beds))) && (!when || h.status === 'now'))
    if (sort === 'low') list = [...list].sort((a, b) => (a.rent ?? 9e12) - (b.rent ?? 9e12))
    if (sort === 'high') list = [...list].sort((a, b) => (b.rent ?? -1) - (a.rent ?? -1))
    return list
  }, [homes, area, beds, when, sort])

  const sel: React.CSSProperties = { padding: '11px 12px', border: '1px solid #D5D8E0', borderRadius: 9, font: 'inherit', fontSize: 14.5, background: '#fff', color: BRAND.ink, minWidth: 0, flex: '1 1 160px', cursor: 'pointer' }
  return (
    <div style={{ fontFamily: "Figtree, -apple-system, 'Segoe UI', sans-serif", color: BRAND.ink, minHeight: '100vh' }}>
      <style>{pageCss}</style>
      <TopBar />
      <div style={{ background: `linear-gradient(160deg, ${BRAND.cream}, #fff 70%)`, padding: '36px 20px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(27px, 4vw, 36px)', margin: '0 0 6px', color: BRAND.brown, letterSpacing: -0.5 }}>Homes to rent</h1>
          <p style={{ margin: 0, color: BRAND.muted, fontSize: 16, maxWidth: 640, lineHeight: 1.5 }}>Quality homes managed by our lettings team. Pick a property to see the photos and details, and book a viewing.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20, maxWidth: 860 }}>
            <select className="lst-in" style={sel} value={area} onChange={e => setArea(e.target.value)} aria-label="Location"><option value="">All locations</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
            <select className="lst-in" style={sel} value={beds} onChange={e => setBeds(e.target.value)} aria-label="Bedrooms"><option value="">Any bedrooms</option><option value="studio">Studio</option><option value="1">1+ bedrooms</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option></select>
            <select className="lst-in" style={sel} value={when} onChange={e => setWhen(e.target.value)} aria-label="Availability"><option value="">Available any time</option><option value="now">Available now</option></select>
            <select className="lst-in" style={sel} value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="new">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ color: BRAND.muted, fontSize: 14, marginBottom: 14 }}>{shown.length} {shown.length === 1 ? 'home' : 'homes'} available</div>
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 16px', color: BRAND.muted, border: `1px dashed ${BRAND.line}`, borderRadius: 14 }}>
            No homes match those filters right now. <button onClick={() => setWanted(true)} style={{ border: 'none', background: 'none', color: BRAND.gd, fontWeight: 600, cursor: 'pointer', font: 'inherit' }}>Tell us what you need</button> and we’ll let you know.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 22 }}>
            {shown.map(h => (
              <a key={h.id} href={`/homes/${h.slug}`} className="lst-card" style={{ border: `1px solid ${BRAND.line}`, borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 16px rgba(98,73,32,.06)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <PhotoSlider photos={h.photos} height={210}>
                  <span style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 20, padding: '5px 11px', fontSize: 12.5, fontWeight: 600, color: h.status === 'now' ? '#00864E' : '#B7791F', zIndex: 3 }}>● {h.status === 'now' ? 'Available now' : h.available_from ? `Available ${new Date(h.available_from + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Available soon'}</span>
                </PhotoSlider>
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: BRAND.brown }}>{h.rent ? <>{money(h.rent, h.currency)} <span style={{ fontSize: 13, fontWeight: 500, color: BRAND.muted }}>/ month</span></> : <span style={{ fontSize: 16 }}>Price on request</span>}</div>
                  <div style={{ fontWeight: 600, margin: '4px 0 2px', fontSize: 16 }}>{titleCase(h.name)}</div>
                  <div style={{ color: BRAND.muted, fontSize: 13.5 }}>{areaOf(h.address)}</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13.5 }}>
                    {h.bedrooms && <b style={{ fontWeight: 600 }}>{bedLabel(h.bedrooms)}</b>}
                    {h.bathrooms && <span>{h.bathrooms} bath</span>}
                    <span style={{ color: BRAND.muted }}>{h.type}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: BRAND.cream, padding: '26px 20px', textAlign: 'center', color: BRAND.brown, fontSize: 15 }}>
        Can’t see what you’re looking for? <button onClick={() => setWanted(true)} style={{ border: 'none', background: 'none', color: BRAND.gd, fontWeight: 700, cursor: 'pointer', font: 'inherit', padding: 0 }}>Tell us what you need</button> and we’ll let you know when something comes up.
        <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 10 }}><a href="https://www.sangstersgroup.com" style={{ color: BRAND.gd, textDecoration: 'none' }}>www.sangstersgroup.com</a></div>
      </div>
      {wanted && <WantedForm areas={areas} onClose={() => setWanted(false)} />}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #D5D8E0', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: BRAND.ink, background: '#fff' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: BRAND.brown, margin: '0 0 6px' }
export { inp, lbl }

function WantedForm({ areas, onClose }: { areas: string[]; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', area: '', bedrooms: '', budget: '', move_date: '', message: '', website: '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await fetch('/api/listings/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'wanted', ...f }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || d.error) setErr(d.error || 'Something went wrong — please try again.'); else setDone(true)
    } catch { setErr('Something went wrong — please try again.') }
    setBusy(false)
  }
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,8,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflow: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, overflow: 'hidden', fontFamily: "Figtree, -apple-system, sans-serif" }}>
        <div style={{ height: 5, background: BRAND.gold }} />
        <div style={{ padding: '22px 22px 24px' }}>
          <button onClick={onClose} aria-label="Close" style={{ float: 'right', border: 'none', background: 'none', fontSize: 26, cursor: 'pointer', color: BRAND.muted, lineHeight: 1 }}>×</button>
          {done ? (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <div style={{ fontSize: 30, color: BRAND.gd }}>✓</div>
              <h2 style={{ color: BRAND.brown, margin: '6px 0' }}>Thanks, {f.name.split(' ')[0]}</h2>
              <p style={{ color: BRAND.muted, lineHeight: 1.6, margin: 0 }}>We’ll be in touch as soon as a suitable home comes up.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0, color: BRAND.brown, fontSize: 21 }}>Tell us what you need</h2>
              <p style={{ margin: '-4px 0 4px', color: BRAND.muted, fontSize: 14.5 }}>We’ll let you know when a home comes up that suits you.</p>
              <div><label style={lbl}>Your name *</label><input className="lst-in" style={inp} value={f.name} onChange={e => set('name', e.target.value)} required autoComplete="name" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><label style={lbl}>Email *</label><input className="lst-in" type="email" style={inp} value={f.email} onChange={e => set('email', e.target.value)} required autoComplete="email" /></div>
                <div><label style={lbl}>Phone</label><input className="lst-in" type="tel" style={inp} value={f.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><label style={lbl}>Area</label><input className="lst-in" style={inp} list="lst-areas" value={f.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Montego Bay" /><datalist id="lst-areas">{areas.map(a => <option key={a} value={a} />)}</datalist></div>
                <div><label style={lbl}>Bedrooms</label><select className="lst-in" style={{ ...inp, cursor: 'pointer' }} value={f.bedrooms} onChange={e => set('bedrooms', e.target.value)}><option value="">Any</option><option value="Studio">Studio</option>{['1', '2', '3', '4', '5+'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                <div><label style={lbl}>Monthly budget</label><input className="lst-in" style={inp} value={f.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. J$120,000" /></div>
                <div><label style={lbl}>When do you want to move?</label><input className="lst-in" style={inp} value={f.move_date} onChange={e => set('move_date', e.target.value)} placeholder="e.g. December" /></div>
              </div>
              <div><label style={lbl}>Anything else?</label><textarea className="lst-in" style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={f.message} onChange={e => set('message', e.target.value)} /></div>
              <input tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set('website', e.target.value)} aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
              {err && <div style={{ color: '#C62828', fontSize: 14 }}>{err}</div>}
              <button disabled={busy} style={{ padding: 13, border: 'none', borderRadius: 10, background: BRAND.gd, color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>{busy ? 'Sending…' : 'Keep me posted'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
