'use client'
// 📍 Local market check — Deal Analyser.
// Claude searches live listings near the deal and compares the deal's own
// figures (price, rent, room rent, landlord rent, sale value) against the
// local low / typical / high, with the comparable listings and links.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { symOf, curOf } from '../../lib/currency'

const C = { gold: '#D0AE4C', gd: '#A8862E', brown: '#624920', cream: '#FBF4E6', ink: '#323338', muted: '#676879', faint: '#9699A6', row: '#E6E9EF', border: '#D0D4E4', green: '#10B981', red: '#EF4444', amber: '#F59E0B' }

// cost = you pay it (lower than market is good); income = you earn it (higher than market is optimistic)
type Metric = { key: string; label: string; value: number; unit: string; compare: string; dir: 'cost' | 'income'; ref?: boolean }

const n = (v: any) => { const x = parseFloat(v); return Number.isFinite(x) && x > 0 ? x : 0 }

export function dealMetrics(strategy: string, form: any): Metric[] {
  const S = symOf(form)
  const beds = (form.bedrooms ? `${form.bedrooms}-bed ` : '') + (form.bathrooms ? `${form.bathrooms}-bath ` : '')
  const type = (form.propertyType || 'property').toLowerCase()
  const out: Metric[] = []
  const add = (m: Metric) => { if (m.value > 0 || m.ref) out.push(m) }
  const isR2R = strategy === 'r2r' || strategy === 'r2hmo'
  if (!isR2R) add({ key: 'price', label: strategy === 'land' ? 'Land price' : 'Purchase price', value: n(form.price), unit: S + '', dir: 'cost', compare: strategy === 'land' ? 'land / plots for sale nearby of similar size' : `asking and recent sold prices for ${beds}${type} nearby` })
  if (['btl', 'brrr', 'social', 'supported'].includes(strategy)) add({ key: 'rent', label: 'Monthly rent', value: n(form.rent), unit: S + '/month', dir: 'income', compare: `${beds}${type} to rent nearby (long let, per calendar month)` })
  if (strategy === 'hmo') add({ key: 'room', label: 'Rent per room', value: n(form.rentPerRoom), unit: S + '/room/month', dir: 'income', compare: 'rooms to rent in house shares / HMOs nearby (SpareRoom etc.), bills included' })
  if (isR2R) add({ key: 'landlord', label: 'Rent you pay the landlord', value: n(form.rent), unit: S + '/month', dir: 'cost', compare: `whole ${beds}${type} to rent nearby on a normal long let (what the landlord could get elsewhere)` })
  if (strategy === 'r2hmo') add({ key: 'room', label: 'Rent per room', value: n(form.subletRent), unit: S + '/room/month', dir: 'income', compare: 'rooms to rent in house shares / HMOs nearby (SpareRoom etc.), bills included' })
  if (strategy === 'r2r') {
    const t = form.termType || 'long'
    add({ key: 'resident', label: t === 'airbnb' ? 'Short-let income per unit' : 'Resident rent per unit', value: n(form.subletRent), unit: S + '/month', dir: 'income', compare: t === 'airbnb' ? `monthly revenue of comparable Airbnb / short lets nearby (nightly rate × occupancy × 30); mention the nightly rates in basis` : t === 'short' ? `furnished serviced-accommodation / corporate lets nearby, monthly` : `furnished ${beds}${type} to rent nearby, per month` })
  }
  if (strategy === 'flip' || strategy === 'brrr') add({ key: 'sale', label: strategy === 'brrr' ? 'End value after refurb' : 'Sale price after refurb', value: n(form.salePrice), unit: S + '', dir: 'income', compare: `recent SOLD prices of refurbished ${beds}${type} nearby` })
  if (strategy === 'land') add({ key: 'gdv', label: 'Gross development value', value: n(form.gdv), unit: S + '', dir: 'income', compare: 'new-build homes for sale or recently sold nearby, scaled to the planned scheme' })
  // Always check what the property would rent for locally, even when the deal has no rent figure
  if (strategy !== 'land' && !out.some(m => m.key === 'rent' || m.key === 'landlord')) add({ key: 'rent_ref', label: 'Local rent for this property', value: 0, unit: S + '/month', dir: 'income', ref: true, compare: `whole ${beds}${type} to rent nearby on a long let, per calendar month (unfurnished and furnished)` })
  return out
}

// unit looks like 'J$/month' — symbol first, then the period
const money = (v: number | null | undefined, unit = '£') => { const m = unit.match(/^(J\$|\$|£)(.*)$/); const sym = m ? m[1] : '£'; return v == null ? '—' : sym + Math.round(v).toLocaleString('en-GB') + (m ? m[2] : '') }

function verdict(m: Metric, b: any) {
  if (!m.value) return { text: 'Market rent', color: '#0E7C55', bg: '#E6F7EF' }
  if (!b?.typical) return { text: 'No market figure', color: C.faint, bg: '#F3F4F7' }
  const diff = (m.value - b.typical) / b.typical * 100
  const pct = Math.abs(Math.round(diff))
  if (pct <= 5) return { text: 'In line with market', color: '#0E7C55', bg: '#E6F7EF' }
  if (m.dir === 'cost') return diff < 0 ? { text: `${pct}% below market ✓`, color: '#0E7C55', bg: '#E6F7EF' } : { text: `${pct}% above market`, color: C.red, bg: '#FDECEC' }
  if (diff > 0) return b.high && m.value > b.high ? { text: `${pct}% above market — optimistic`, color: C.red, bg: '#FDECEC' } : { text: `${pct}% above typical`, color: '#9A6400', bg: '#FFF4DE' }
  return { text: `${pct}% below market (cautious)`, color: '#0E7C55', bg: '#E6F7EF' }
}

function RangeBar({ m, b }: { m: Metric; b: any }) {
  if (!b?.low || !b?.high) return null
  const lo = Math.min(b.low, m.value || b.low) * 0.92, hi = Math.max(b.high, m.value || b.high) * 1.08
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div style={{ position: 'relative', height: 34, marginTop: 6 }}>
      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, background: '#EEF0F4' }} />
      <div style={{ position: 'absolute', top: 12, left: pos(b.low), width: `calc(${pos(b.high)} - ${pos(b.low)})`, height: 6, borderRadius: 3, background: '#E9D9A8' }} />
      {b.typical && <div title="Market typical" style={{ position: 'absolute', top: 8, left: pos(b.typical), width: 2, height: 14, background: C.brown, transform: 'translateX(-1px)' }} />}
      {m.value > 0 && <div title="Your figure" style={{ position: 'absolute', top: 6, left: pos(m.value), width: 18, height: 18, borderRadius: '50%', background: C.gd, border: '3px solid #fff', boxShadow: '0 0 0 1px ' + C.gd, transform: 'translateX(-9px)' }} />}
      <div style={{ position: 'absolute', top: 24, left: pos(b.low), fontSize: 10.5, color: C.faint, transform: 'translateX(-50%)' }}>{money(b.low, m.unit.match(/^(J\$|\$|£)/)?.[0])}</div>
      <div style={{ position: 'absolute', top: 24, left: pos(b.high), fontSize: 10.5, color: C.faint, transform: 'translateX(-50%)' }}>{money(b.high, m.unit.match(/^(J\$|\$|£)/)?.[0])}</div>
    </div>
  )
}

const TYPE_COL: Record<string, string> = { 'For sale': '#2563EB', Sold: '#7A35B8', 'To rent': '#0E7C55', Room: '#B45309', 'Short let': '#DB2777', Land: '#57534E' }

export default function MarketCheck({ strategy, strategyLabel, form, setForm, market, onMarket }: {
  strategy: string; strategyLabel?: string; form: any; setForm: (f: any) => void; market: any; onMarket: (m: any) => void
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const metrics = dealMetrics(strategy, form)
  const inp = { padding: '9px 11px', border: '1px solid ' + C.border, borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }

  async function check() {
    if (!form.address?.trim()) { setErr('Add the property’s location (street, town or postcode) first.'); return }
    setLoading(true); setErr(null)
    const { data: { session } } = await supabase.auth.getSession()
    const base = { strategy, strategyLabel, currency: curOf(form), location: form.address, bedrooms: form.bedrooms, bathrooms: form.bathrooms, propertyType: form.propertyType, letting: strategy === 'r2r' ? form.termType || 'long' : undefined }
    // One search per figure plus an area overview, all at once
    const call = async (body: any) => {
      const res = await fetch('/api/deal-market', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ ...base, ...body }) })
      const d = await res.json().catch(() => null)
      if (!d) throw new Error('That search took too long')
      if (d.error) throw new Error(d.error)
      return d.part
    }
    const jobs = [call({ mode: 'overview', metrics }), ...metrics.map(m => call({ mode: 'metric', metrics: [m] }))]
    const got = await Promise.allSettled(jobs)
    const ok = got.map(g => g.status === 'fulfilled' ? g.value : null)
    const ov = ok[0] || {}
    const parts = ok.slice(1)
    if (!parts.some(Boolean) && !ok[0]) {
      const r = got.find(g => g.status === 'rejected') as PromiseRejectedResult | undefined
      setErr((r?.reason?.message || 'The market search failed') + ' — try again.'); setLoading(false); return
    }
    const rank: Record<string, number> = { High: 3, Medium: 2, Low: 1 }
    const confs = ok.filter(Boolean).map((p: any) => p.confidence).filter(Boolean)
    const confidence = confs.length ? confs.reduce((a: string, b: string) => rank[b] < rank[a] ? b : a) : 'Low'
    const seen = new Set<string>()
    const comparables = parts.flatMap((p: any) => p?.comparables || []).filter((c: any) => { const k = (c.url || c.title).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
    const srcSeen = new Set(comparables.map((c: any) => c.url).filter(Boolean))
    const sources = ok.flatMap((p: any) => p?.sources || []).filter((x: any) => { if (srcSeen.has(x.url)) return false; srcSeen.add(x.url); return true }).slice(0, 8)
    const missing = metrics.filter((_, i) => !parts[i]).map(m => m.label)
    onMarket({
      checkedAt: new Date().toISOString(), location: form.address, bedrooms: form.bedrooms || null, bathrooms: form.bathrooms || null, propertyType: form.propertyType || null,
      metrics, benchmarks: parts.filter(Boolean).map((p: any) => p.benchmark), comparables, sources,
      area: ov.area || '', demand: ov.demand || '', watch_outs: ov.watch_outs || [],
      confidence, confidence_reason: [ov.confidence_reason, missing.length ? `Couldn’t get market data for: ${missing.join(', ')}.` : ''].filter(Boolean).join(' '),
    })
    setLoading(false)
  }

  const bm = (k: string) => market?.benchmarks?.find((b: any) => b.key === k)
  const shown: Metric[] = market?.metrics?.length ? market.metrics.map((m: any) => ({ ...metrics.find(x => x.key === m.key), ...m, dir: metrics.find(x => x.key === m.key)?.dir || (m.key === 'price' || m.key === 'landlord' ? 'cost' : 'income') })) : []
  const stale = market && (market.location !== form.address || metrics.some(m => shown.find(s => s.key === m.key)?.value !== m.value))

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid ' + C.row, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>📍 Local market check</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>The AI searches live listings near this property and compares your figures with what the local market is asking and achieving.</div>
        </div>
        {market && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: market.confidence === 'High' ? '#E6F7EF' : market.confidence === 'Medium' ? '#FFF4DE' : '#FDECEC', color: market.confidence === 'High' ? '#0E7C55' : market.confidence === 'Medium' ? '#9A6400' : C.red }} title={market.confidence_reason}>{market.confidence} confidence</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,2fr) 100px 100px minmax(130px,1fr) auto', gap: 10, marginTop: 14, alignItems: 'end' }}>
        <div><div style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Location</div><input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, town or postcode" style={{ ...inp, width: '100%' }} /></div>
        <div><div style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Bedrooms</div><input value={form.bedrooms || ''} onChange={e => setForm({ ...form, bedrooms: e.target.value })} type="number" placeholder="e.g. 3" style={{ ...inp, width: '100%' }} /></div>
        <div><div style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Bathrooms</div><input value={form.bathrooms || ''} onChange={e => setForm({ ...form, bathrooms: e.target.value })} type="number" step="0.5" placeholder="e.g. 2" style={{ ...inp, width: '100%' }} /></div>
        <div><div style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Property type</div>
          <select value={form.propertyType || ''} onChange={e => setForm({ ...form, propertyType: e.target.value })} style={{ ...inp, width: '100%' }}>
            <option value="">Any</option>{['House', 'Terraced house', 'Semi-detached house', 'Detached house', 'Flat / apartment', 'Bungalow', 'Townhouse', 'Villa', 'Land'].map(t => <option key={t}>{t}</option>)}
          </select></div>
        <button onClick={check} disabled={loading} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: C.gd, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>{loading ? 'Searching…' : market ? '↻ Check again' : '🔍 Check local market'}</button>
      </div>
      {err && <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{err}</div>}
      {loading && <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 8, background: C.cream, fontSize: 13, color: C.brown }}>Searching sale, rental, room and short-let listings near {form.address}… this usually takes under a minute.</div>}
      {stale && !loading && <div style={{ marginTop: 10, fontSize: 12, color: '#9A6400' }}>Your figures or location have changed since this check — run it again to update the comparison.</div>}

      {market && !loading && (
        <div style={{ marginTop: 18 }}>
          {market.area && <div style={{ fontSize: 13.5, color: '#344054', lineHeight: 1.6, marginBottom: 16 }}>{market.area}</div>}

          {shown.length > 0 && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Your deal vs the market</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: 20 }}>
              {shown.map(m => { const b = bm(m.key); const v = verdict(m, b); return (
                <div key={m.key} style={{ border: '1px solid ' + C.row, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, flex: 1 }}>{m.label}</div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: v.bg, color: v.color }}>{v.text}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 18, marginTop: 6, alignItems: 'baseline' }}>
                    <div><div style={{ fontSize: 10.5, color: C.faint, textTransform: 'uppercase', letterSpacing: '.04em' }}>Yours</div><div style={{ fontSize: 19, fontWeight: 800, color: C.ink }}>{m.value ? money(m.value, m.unit) : 'Not entered'}</div></div>
                    <div><div style={{ fontSize: 10.5, color: C.faint, textTransform: 'uppercase', letterSpacing: '.04em' }}>Market typical</div><div style={{ fontSize: 19, fontWeight: 800, color: C.brown }}>{money(b?.typical, m.unit)}</div></div>
                  </div>
                  <RangeBar m={m} b={b} />
                  {m.key === 'rent_ref' && b?.typical && n(form.price) > 0 && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.brown, marginTop: 4 }}>Gross yield at market rent: {((b.typical * 12) / n(form.price) * 100).toFixed(1)}%</div>}
                  {b?.basis && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4, lineHeight: 1.45 }}>{b.basis}</div>}
                </div>
              ) })}
            </div>
          </>}

          {market.comparables?.length > 0 && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Comparables found ({market.comparables.length})</div>
            <div style={{ overflowX: 'auto', border: '1px solid ' + C.row, borderRadius: 8, marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
                <thead><tr style={{ background: '#F7F8FA' }}>{['Type', 'Property', 'Beds', 'Price', 'Source'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11.5, color: C.muted, fontWeight: 600, borderBottom: '1px solid ' + C.row }}>{h}</th>)}</tr></thead>
                <tbody>{market.comparables.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: i < market.comparables.length - 1 ? '1px solid ' + C.row : 'none' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}><span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COL[c.type] || C.muted, background: (TYPE_COL[c.type] || C.muted) + '14', padding: '2px 7px', borderRadius: 4 }}>{c.type}</span></td>
                    <td style={{ padding: '9px 12px' }}><div style={{ fontWeight: 600, color: C.ink }}>{c.title}</div>{c.location && <div style={{ fontSize: 12, color: C.faint }}>{c.location}</div>}</td>
                    <td style={{ padding: '9px 12px', color: C.muted }}>{c.beds ?? '—'}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}><div style={{ fontWeight: 700, color: C.ink }}>{money(c.price, c.unit)}</div>{c.price_text && !c.price_text.startsWith(c.unit.match(/^(J\$|\$|£)/)?.[0] || '£') && <div style={{ fontSize: 11.5, color: C.faint }}>{c.price_text}</div>}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: C.gd, fontWeight: 600, textDecoration: 'none' }}>{c.source || 'View'} ↗</a> : <span style={{ color: C.faint }}>{c.source || '—'}</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
            {market.demand && <div style={{ background: '#F7F8FA', borderRadius: 8, padding: '12px 14px' }}><div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Demand</div><div style={{ fontSize: 13, color: '#344054', lineHeight: 1.6 }}>{market.demand}</div></div>}
            {market.watch_outs?.length > 0 && <div style={{ background: '#FFF8EC', borderRadius: 8, padding: '12px 14px' }}><div style={{ fontSize: 12.5, fontWeight: 700, color: '#9A6400', marginBottom: 4 }}>⚠ Watch out for</div><ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#344054', lineHeight: 1.6 }}>{market.watch_outs.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>}
          </div>

          {market.sources?.length > 0 && <div style={{ marginTop: 14, fontSize: 12, color: C.faint, lineHeight: 1.8 }}>Also searched: {market.sources.map((s: any, i: number) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, marginRight: 10 }}>{s.title.slice(0, 50)}</a>)}</div>}
          <div style={{ marginTop: 10, fontSize: 11.5, color: C.faint, fontStyle: 'italic' }}>Checked {new Date(market.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} from live web listings. Asking prices aren’t sold prices — verify the key comparables before making an offer.{market.confidence_reason ? ' ' + market.confidence_reason : ''}</div>
        </div>
      )}
    </div>
  )
}
