'use client'
// The four Market intelligence panels on the Dashboard. Presentational only: MarketIntelPanels.tsx loads the
// data. Each panel links to the Invest page that holds the records behind it.
import React, { useState } from 'react'
import Link from 'next/link'
import { fmtMoney, type Intel, type Insight, type Tone } from '../../lib/market-intel'

const C = { ink: '#0f2150', goldT: '#5470a8', line: '#dfe6f4', muted: '#6b7fae', text: '#2b3f6e', blue: '#2f5bd6' }
const card: React.CSSProperties = { background: 'rgba(255,255,255,.88)', border: '1px solid rgba(47,91,214,.14)', borderRadius: 16, boxShadow: '0 6px 20px rgba(47,91,214,.08)', padding: '18px 20px', minWidth: 0 }
const TONE: Record<Tone, { c: string; bg: string; d: string }> = {
  up: { c: '#138a62', bg: '#E6F7EF', d: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  info: { c: '#2f5bd6', bg: '#E8F0FB', d: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  flat: { c: '#B7791F', bg: '#FFF4DE', d: 'M5 9h14M5 15h14' },
  warn: { c: '#B42318', bg: '#FDECEC', d: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
}
const Svg = ({ d, c, s = 16 }: { d: string; c: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}><path d={d} /></svg>
const HOUSE = 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'
const BUILDING = 'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2M3 21h18'
const PIN = 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'

const H = ({ title, href, link }: { title: string; href: string; link: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{title}</div>
    <Link href={href} style={{ fontSize: 12.5, color: C.goldT, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{link}</Link>
  </div>
)
const Empty = ({ text, href, cta }: { text: string; href: string; cta: string }) => (
  <div style={{ fontSize: 13, color: C.muted, padding: '14px 0' }}>{text} <Link href={href} style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>{cta}</Link></div>
)
const Thumb = ({ src, d = HOUSE, size = 46 }: { src?: string | null; d?: string; size?: number }) => (
  <span style={{ width: size, height: size, borderRadius: 10, background: '#E8F0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
    {src ? <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : <Svg d={d} c={C.blue} s={Math.round(size * 0.46)} />}
  </span>
)

export default function MarketIntelView({ intel, insights, insightsBusy, example, onRefresh }: {
  intel: Intel; insights: Insight[]; insightsBusy?: boolean; example?: boolean; onRefresh?: () => void
}) {
  const [tab, setTab] = useState(0)
  const g = intel.groups[Math.min(tab, Math.max(0, intel.groups.length - 1))]
  const f = intel.featured
  const INVEST = '/invest', WATCH = '/invest?section=Watchlist', DEALS = '/invest?section=Saved%20Deals'
  return (
    <div className="mi-grid">
      <style>{`.mi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        @media(max-width:900px){.mi-grid{grid-template-columns:1fr}}
        .mi-row:hover{background:#F4F8FF}`}</style>

      {/* Featured Property Analysis */}
      <div style={card}>
        <H title="Featured Property Analysis" href={DEALS} link="Saved deals →" />
        {!f ? <Empty text="Your best-yield saved deal appears here once a deal has a purchase price and a rent." href={INVEST} cta="Analyse a deal →" /> : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ width: 150, height: 130, borderRadius: 12, background: '#E8F0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, maxWidth: '100%' }}>
              {f.photo ? <img src={f.photo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : <Svg d={BUILDING} c={C.blue} s={52} />}
            </span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{f.name}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{[f.beds && `${f.beds} Bed`, f.baths && `${f.baths} Bath`, f.sqft && `${f.sqft.toLocaleString('en-GB')} sq ft`].filter(Boolean).join(' | ') || 'Saved deal'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
                {[['Asking price', fmtMoney(f.price, f.cur)], ['Est. monthly rent', fmtMoney(f.rent, f.cur)], ['Est. gross yield', f.yield.toFixed(1) + '%']].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 11, color: C.muted }}>{l}</div><div style={{ fontSize: 14.5, fontWeight: 800, color: l === 'Est. gross yield' ? '#138a62' : C.ink, marginTop: 2, whiteSpace: 'nowrap' }}>{v}</div></div>
                ))}
              </div>
              <Link href={DEALS} style={{ display: 'inline-block', marginTop: 16, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.blue}`, color: C.blue, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>View Full Analysis →</Link>
            </div>
          </div>
        )}
      </div>

      {/* Top Locations by Rental Yield */}
      <div style={card}>
        <H title="Top Locations by Rental Yield" href={DEALS} link="Saved deals →" />
        {!g ? <Empty text="Locations are ranked from your saved deals that have a purchase price and a rent." href={INVEST} cta="Analyse a deal →" /> : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {intel.groups.map((x, i) => <button key={x.tab} onClick={() => setTab(i)} style={{ flex: '1 1 0', minWidth: 90, padding: '7px 10px', borderRadius: 9, border: '1px solid ' + (i === tab ? C.blue : C.line), background: i === tab ? C.blue : '#fff', color: i === tab ? '#fff' : C.text, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{x.tab}</button>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', fontSize: 11, color: C.muted, padding: '6px 4px', borderBottom: `1px solid ${C.line}` }}><span>Location</span><span style={{ textAlign: 'right' }}>Avg. yield</span><span style={{ textAlign: 'right' }}>MoM change</span></div>
            {g.rows.map(r => (
              <Link key={r.name} href={DEALS} className="mi-row" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #EEF2FA', textDecoration: 'none', color: C.text, fontSize: 13, borderRadius: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Svg d={PIN} c="#B7791F" s={15} /><span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span></span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: C.ink }}>{r.yield.toFixed(1)}%</span>
                <span style={{ textAlign: 'right', fontWeight: 600, color: r.change == null ? C.muted : r.change >= 0 ? '#138a62' : '#B42318' }}>{r.change == null ? '—' : `${r.change >= 0 ? '↑' : '↓'} ${Math.abs(r.change).toFixed(1)}%`}</span>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Quick Insights (AI) */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Quick Insights (AI)</div>
          {onRefresh && <button onClick={onRefresh} disabled={insightsBusy} style={{ border: '1px solid #cfdcf3', background: '#fff', color: C.text, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: insightsBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>{insightsBusy ? 'Writing…' : 'Refresh'}</button>}
        </div>
        {insights.length === 0 ? <Empty text={insightsBusy ? 'Writing insights from your saved deals…' : 'Insights appear once you have saved deals or a watchlist.'} href={INVEST} cta="Open Invest →" /> : insights.map((s, i) => {
          const t = TONE[s.tone] ?? TONE.info
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: i < insights.length - 1 ? '1px solid #EEF2FA' : 'none' }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Svg d={t.d} c={t.c} s={16} /></span>
              <span style={{ fontSize: 13, lineHeight: 1.45, color: C.text, paddingTop: 5 }}>{s.text}</span>
            </div>
          )
        })}
        <Link href={INVEST} style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.blue}`, color: C.blue, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Open market check →</Link>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{example ? 'Example sentences for preview only.' : 'Written by AI from your saved deals and watchlist only. No outside market figures are added.'}</div>
      </div>

      {/* My Watchlist */}
      <div style={card}>
        <H title="My Watchlist" href={WATCH} link={intel.watchTotal > 4 ? `View all ${intel.watchTotal} →` : 'View all →'} />
        {intel.watch.length === 0 ? <Empty text="No properties on your watchlist yet." href={WATCH} cta="Add a property →" /> : intel.watch.map((w, i) => (
          <Link key={w.id} href={WATCH} className="mi-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', borderBottom: i < intel.watch.length - 1 ? '1px solid #EEF2FA' : 'none', textDecoration: 'none', color: C.text, borderRadius: 6 }}>
            <Thumb src={w.photo} d={BUILDING} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.sub || 'On watchlist'}</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: w.yield == null ? C.muted : '#138a62', whiteSpace: 'nowrap' }}>{w.yield == null ? 'No yield yet' : `${w.yield.toFixed(1)}% yield`}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
