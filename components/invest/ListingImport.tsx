'use client'

// Import a property from a listing link (Jamaica MLS / Xposure links, or any
// page with Open Graph tags) and show its photos and full details alongside
// the Deal Analyser. The imported listing is kept on the deal as form.listing,
// so it is saved with the deal and shows again when the deal is reopened.

import { useState, useEffect, useCallback } from 'react'

export type Listing = {
  source: string; sourceUrl: string; mls: string | null; address: string; area: string | null; subarea: string | null
  price: number | null; priceText: string | null; currency: 'JMD' | 'USD' | 'GBP' | null; status: string | null
  saleOrRent: string | null; rentalPrice: string | null; style: string | null; bedrooms: number | null; bathrooms: number | null
  sqft: number | null; lotSqft: number | null; lotAcres: number | null; yearBuilt: string | null; daysOnMarket: number | null
  amenities: string | null; siteInfluence: string | null; exterior: string | null; subdivision: string | null
  description: string | null; lat: number | null; lng: number | null; photos: string[]; agent?: string | null
}

const C = { ink: '#191815', text: '#323338', muted: '#676879', line: '#E6E9EF', soft: '#F7F8FA', gold: '#A8862E', goldBg: '#FBF6EA', red: '#B42318' }
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D4E4', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }
const fmt = (n: number | null | undefined, d = 0) => n == null ? '—' : n.toLocaleString('en-GB', { maximumFractionDigits: d })

export function propertyTypeFor(style: string | null): string {
  const s = (style || '').toLowerCase()
  if (!s) return ''
  if (/apart|flat|condo/.test(s)) return 'Flat / apartment'
  if (/town/.test(s)) return 'Townhouse'
  if (/villa/.test(s)) return 'Villa'
  if (/bungalow/.test(s)) return 'Bungalow'
  if (/land|lot/.test(s)) return 'Land'
  if (/detached/.test(s)) return /semi/.test(s) ? 'Semi-detached house' : 'Detached house'
  return 'House'
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}
const I = {
  link: 'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5',
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', close: 'M18 6L6 18M6 6l12 12',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
}

// ── Import box ──────────────────────────────────────────────────────────
export function ListingImportBox({ authHeaders, onImport, compact }: { authHeaders: () => Promise<Record<string, string>>; onImport: (l: Listing) => void; compact?: boolean }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [choices, setChoices] = useState<Listing[] | null>(null)

  async function go() {
    if (!url.trim()) return
    setLoading(true); setErr(null); setChoices(null)
    try {
      const res = await fetch('/api/listing-import', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ url: url.trim() }) })
      const data = await res.json()
      if (!res.ok) setErr(data.error || 'Could not import that link.')
      else if (data.listings.length === 1) { onImport(data.listings[0]); setUrl('') }
      else setChoices(data.listings)
    } catch { setErr('Could not reach the portal — check your connection.') }
    setLoading(false)
  }

  return (
    <div style={{ background: compact ? 'transparent' : C.goldBg, border: compact ? 'none' : '1px solid #EADFC2', borderRadius: 8, padding: compact ? 0 : '16px 18px', marginBottom: compact ? 0 : 20 }}>
      {!compact && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: C.text }}><span style={{ color: C.gold, display: 'flex' }}><Icon d={I.link} /></span>Import from a listing link</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: '3px 0 10px' }}>Paste an MLS / Xposure link from an agent. The photos and full details come in and the form fills itself.</div>
      </>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} placeholder="https://jamaica.xposureapp.com/portal/jamaica/InteractiveLink?…" style={{ ...inp, flex: 1, minWidth: 0 }} />
        <button onClick={go} disabled={loading || !url.trim()} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: C.ink, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading || !url.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}>{loading ? 'Importing…' : 'Import'}</button>
      </div>
      {err && <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{err}</div>}
      {choices && <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 12.5, color: C.muted }}>This link has {choices.length} properties. Pick one:</div>
        {choices.map((l, i) => (
          <button key={i} onClick={() => { onImport(l); setChoices(null); setUrl('') }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            {l.photos[0] && <img src={l.photos[0] + '&thumbnail'} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4 }} />}
            <span style={{ fontSize: 13, color: C.text }}><b>{l.address}</b><br /><span style={{ color: C.muted }}>{l.priceText} · {l.bedrooms ?? '—'} bed · {l.bathrooms ?? '—'} bath</span></span>
          </button>
        ))}
      </div>}
    </div>
  )
}

// ── Property card with gallery ──────────────────────────────────────────
export function ListingCard({ listing: l, onRemove, authHeaders, onImport }: { listing: Listing; onRemove?: () => void; authHeaders?: () => Promise<Record<string, string>>; onImport?: (l: Listing) => void }) {
  const [i, setI] = useState(0)
  const [big, setBig] = useState(false)
  const [more, setMore] = useState(false)
  const [replace, setReplace] = useState(false)
  const n = l.photos.length
  const go = useCallback((d: number) => setI(x => (x + d + n) % n), [n])

  useEffect(() => {
    if (!big) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [big, go])

  const specs: [string, string][] = ([
    ['Price', l.priceText || '—'],
    ['Bedrooms', fmt(l.bedrooms)],
    ['Bathrooms', fmt(l.bathrooms, 1)],
    ['Style', l.style || '—'],
    ['Floor area', l.sqft ? `${fmt(l.sqft)} sq ft` : '—'],
    ['Lot', l.lotSqft ? `${fmt(l.lotSqft)} sq ft${l.lotAcres ? ` · ${fmt(l.lotAcres, 2)} acres` : ''}` : l.lotAcres ? `${fmt(l.lotAcres, 2)} acres` : '—'],
    ['Sale or rent', l.saleOrRent || '—'],
    ['Rental price', l.rentalPrice || '—'],
    ['Days on market', fmt(l.daysOnMarket)],
    ['Year built', l.yearBuilt || '—'],
  ] as [string, string][]).filter(([, v]) => v !== '—')
  const extra: [string, string | null][] = [['Amenities', l.amenities], ['Area', l.siteInfluence], ['Exterior', l.exterior], ['Subdivision', l.subdivision]]
  const statusTone = /expired|withdrawn|cancel/i.test(l.status || '') ? { bg: '#FDECEC', c: C.red } : /sold|under/i.test(l.status || '') ? { bg: '#FFF4DE', c: '#9A6400' } : { bg: '#E6F7EF', c: '#0E7C55' }
  const map = l.lat && l.lng ? `https://www.google.com/maps?q=${l.lat},${l.lng}` : `https://www.google.com/maps/search/${encodeURIComponent([l.address, l.subarea, l.area, 'Jamaica'].filter(Boolean).join(', '))}`
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.line}`, background: '#fff', fontSize: 12, color: '#344054', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }
  const arrow = (side: 'left' | 'right', size = 34): React.CSSProperties => ({ position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)', width: size, height: size, borderRadius: size, border: 'none', background: 'rgba(25,24,21,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderTop: `3px solid ${C.gold}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' }}>
        {/* Gallery */}
        <div style={{ background: C.ink, minWidth: 0 }}>
          {n > 0 ? <>
            <div style={{ position: 'relative', aspectRatio: '4 / 3', cursor: 'zoom-in' }} onClick={() => setBig(true)}>
              <img src={l.photos[i]} alt={`Photo ${i + 1} of ${l.address}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {n > 1 && <>
                <button aria-label="Previous photo" onClick={e => { e.stopPropagation(); go(-1) }} style={arrow('left')}><Icon d={I.left} /></button>
                <button aria-label="Next photo" onClick={e => { e.stopPropagation(); go(1) }} style={arrow('right')}><Icon d={I.right} /></button>
              </>}
              <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(25,24,21,.75)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 4 }}>{i + 1} / {n}</span>
            </div>
            {n > 1 && <div style={{ display: 'flex', gap: 4, padding: 6, overflowX: 'auto' }}>
              {l.photos.map((p, k) => (
                <button key={k} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} style={{ flex: '0 0 auto', padding: 0, border: k === i ? `2px solid ${C.gold}` : '2px solid transparent', borderRadius: 4, background: 'none', cursor: 'pointer', opacity: k === i ? 1 : 0.7 }}>
                  <img src={/realtyserver/.test(p) ? p + '&thumbnail' : p} alt="" loading="lazy" style={{ width: 64, height: 48, objectFit: 'cover', display: 'block', borderRadius: 2 }} />
                </button>
              ))}
            </div>}
          </> : <div style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A958A', fontSize: 13 }}>No photos on this listing</div>}
        </div>

        {/* Details */}
        <div style={{ padding: '18px 20px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: C.gold }}>Imported listing{l.mls ? ` · MLS# ${l.mls}` : ''}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginTop: 4, lineHeight: 1.25 }}>{l.address}</div>
              {(l.subarea || l.area) && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{[l.subarea, l.area].filter(Boolean).join(', ')}</div>}
            </div>
            {l.status && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: statusTone.bg, color: statusTone.c, whiteSpace: 'nowrap' }}>{l.status}</span>}
          </div>

          {l.priceText && <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 12 }}>{l.priceText}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 40%), 1fr))', gap: '10px 16px', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            {specs.filter(([k]) => k !== 'Price').map(([k, v]) => (
              <div key={k}><div style={{ fontSize: 11.5, color: C.muted }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 1 }}>{v}</div></div>
            ))}
          </div>

          {extra.some(([, v]) => v) && <div style={{ marginTop: 14, display: 'grid', gap: 4 }}>
            {extra.filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ fontSize: 13, color: C.text }}><span style={{ color: C.muted }}>{k}: </span>{v}</div>)}
          </div>}

          {l.description && <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3b3833', whiteSpace: 'pre-wrap', ...(more ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }) }}>{l.description}</div>
            {l.description.length > 260 && <button onClick={() => setMore(!more)} style={{ border: 'none', background: 'none', padding: 0, marginTop: 4, fontSize: 12.5, fontWeight: 600, color: C.gold, cursor: 'pointer', fontFamily: 'inherit' }}>{more ? 'Show less' : 'Read more'}</button>}
          </div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
            <a href={map} target="_blank" rel="noreferrer" style={btn}><Icon d={I.pin} size={14} />Map</a>
            <a href={l.sourceUrl} target="_blank" rel="noreferrer" style={btn}><Icon d={I.ext} size={14} />Original listing</a>
            {authHeaders && onImport && <button onClick={() => setReplace(!replace)} style={btn}><Icon d={I.link} size={14} />Different link</button>}
            {onRemove && <button onClick={onRemove} style={{ ...btn, color: C.muted }}>Remove</button>}
          </div>
          {replace && authHeaders && onImport && <div style={{ marginTop: 10 }}><ListingImportBox compact authHeaders={authHeaders} onImport={x => { onImport(x); setReplace(false); setI(0) }} /></div>}
          <div style={{ fontSize: 11, color: '#9699A6', marginTop: 12 }}>Source: {l.source}. Details as listed by the agent — verify before making an offer.</div>
        </div>
      </div>

      {/* Full-screen viewer */}
      {big && n > 0 && (
        <div onClick={() => setBig(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(12,12,10,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={l.photos[i]} alt={`Photo ${i + 1}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 4 }} />
          <button aria-label="Close" onClick={() => setBig(false)} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 40, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon d={I.close} size={20} /></button>
          {n > 1 && <>
            <button aria-label="Previous photo" onClick={e => { e.stopPropagation(); go(-1) }} style={arrow('left', 46)}><Icon d={I.left} size={22} /></button>
            <button aria-label="Next photo" onClick={e => { e.stopPropagation(); go(1) }} style={arrow('right', 46)}><Icon d={I.right} size={22} /></button>
          </>}
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#E8E4DA', fontSize: 13 }}>{l.address} · {i + 1} / {n}</div>
        </div>
      )}
    </div>
  )
}
