'use client'
// Real Estate Intelligence → Vacation Rentals → Dynamic Dossier.
// Suggested nightly prices and results for this company's own short-stay properties. Prices are suggestions only:
// nothing is sent to Airbnb or any other channel from here.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cur } from '@/lib/company-currency'
import { DEFAULTS, bookedNights, suggest, performance, type Booking, type Settings } from '@/lib/dossier'

type Prop = { id: string; name: string; city?: string | null; nightly_rate?: number | null }
type Row = Settings & { property_id: string }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 20 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
const pctTxt = (n: number) => `${Math.round(n * 100)}%`

// Labelled sample so the page can be previewed with no data. Not this company's records.
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const sampleProps: Prop[] = [{ id: 'x1', name: 'Example: Harbour View 2 bed' }, { id: 'x2', name: 'Example: Hope Road townhouse' }]
const sampleBookings = (): Booking[] => { const t = Date.now(), d = (n: number) => iso(new Date(t + n * 864e5)); return [
  { property_id: 'x1', check_in: d(-25), check_out: d(-20), total_amount: 90000 }, { property_id: 'x1', check_in: d(-12), check_out: d(-6), total_amount: 108000 },
  { property_id: 'x1', check_in: d(2), check_out: d(5), total_amount: 54000 }, { property_id: 'x1', check_in: d(6), check_out: d(9), total_amount: 57000 },
  { property_id: 'x1', check_in: d(14), check_out: d(20), total_amount: 120000 }, { property_id: 'x2', check_in: d(-18), check_out: d(-14), total_amount: 64000 },
  { property_id: 'x2', check_in: d(4), check_out: d(7), total_amount: 51000 }] }

export default function DynamicDossier() {
  const [props, setProps] = useState<Prop[]>([]), [rules, setRules] = useState<Record<string, Settings>>({}), [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true), [err, setErr] = useState(''), [sample, setSample] = useState(false)
  const [sel, setSel] = useState(''), [view, setView] = useState<'Rates' | 'Performance'>('Rates')
  const [draft, setDraft] = useState<Record<string, any>>({}), [saving, setSaving] = useState(false), [msg, setMsg] = useState('')
  const c = cur()

  const hdr = async () => { const { data: { session } } = await supabase.auth.getSession(); return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` } }
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/dossier', { headers: await hdr(), cache: 'no-store' }); const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not load')
      setProps(j.properties); setBookings(j.bookings); setErr('')
      const m: Record<string, Settings> = {}; for (const s of j.settings as Row[]) m[s.property_id] = { ...DEFAULTS, ...s }
      setRules(m); setSel(p => p || j.properties[0]?.id || '')
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const f = () => { if (document.visibilityState === 'visible') load() }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [load])

  const P = sample ? sampleProps : props, B = sample ? sampleBookings() : bookings
  const cur_ = sel && P.some(p => p.id === sel) ? sel : P[0]?.id || ''
  const prop = P.find(p => p.id === cur_)
  const saved: Settings = sample ? { ...DEFAULTS, base_price: 18000, floor_price: 12000, ceiling_price: 30000 } : (rules[cur_] ?? { ...DEFAULTS, base_price: prop?.nightly_rate ?? null })
  const st: Settings = { ...saved, ...draft } as Settings
  useEffect(() => { setDraft({}); setMsg('') }, [cur_])
  const nights = useMemo(() => cur_ ? suggest(st, bookedNights(B, cur_)) : [], [cur_, B, JSON.stringify(st)])
  const perf = useMemo(() => performance(P, B), [P, B])
  const set = (k: keyof Settings, v: any) => setDraft(d => ({ ...d, [k]: v }))
  const save = async () => {
    setSaving(true); setMsg('')
    try { const r = await fetch('/api/dossier', { method: 'POST', headers: await hdr(), body: JSON.stringify({ action: 'save', propertyId: cur_, ...st }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setDraft({}); setMsg('Saved.'); load() }
    catch (e: any) { setMsg(e.message || 'Could not save') } finally { setSaving(false) }
  }
  const num = (k: keyof Settings) => <input type="number" min={0} style={inp} disabled={sample} value={(st[k] as any) ?? ''} onChange={e => set(k, e.target.value === '' ? null : Number(e.target.value))} />
  const pc = (k: keyof Settings) => <input type="number" min={0} max={50} style={inp} disabled={sample} value={(st[k] as any) ?? 0} onChange={e => set(k, Number(e.target.value))} />

  if (loading) return <div style={{ color: '#667085' }}>Loading…</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['Rates', 'Performance'] as const).map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid ' + (view === v ? '#2F6DB5' : '#D0D5DD'), background: view === v ? '#EAF2FB' : '#fff', color: view === v ? '#2F6DB5' : '#344054', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{v}</button>)}
        <div style={{ flex: 1 }} />
        <button onClick={() => setSample(s => !s)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>{sample ? 'Back to my data' : 'Preview example'}</button>
        <button onClick={load} disabled={sample} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Refresh</button>
      </div>
      {sample && <div style={{ background: '#FFF7E6', border: '1px solid #F5D9A8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7A4B00' }}>Example data only. These are not your properties or bookings.</div>}
      {err && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#B42318' }}>{err}</div>}
      {!P.length && !err && <div style={card}>No vacation rental properties yet. Add one in Properties, or use Preview example to see how this page works.</div>}

      {P.length > 0 && view === 'Rates' && <>
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={lbl}>Property</span>
          <select value={cur_} onChange={e => setSel(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 240 }}>{P.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Your rules</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label><div style={lbl}>Base ({c})</div>{num('base_price')}</label>
              <label><div style={lbl}>Floor ({c})</div>{num('floor_price')}</label>
              <label><div style={lbl}>Ceiling ({c})</div>{num('ceiling_price')}</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <label><div style={lbl}>Weekend uplift %</div>{pc('weekend_pct')}</label>
              <label><div style={lbl}>Last-minute cut %</div>{pc('last_minute_pct')}</label>
              <label><div style={lbl}>Single-night gap cut %</div>{pc('gap_pct')}</label>
              <label><div style={lbl}>Busy-month uplift %</div>{pc('demand_pct')}</label>
            </div>
            <div style={{ fontSize: 12, color: '#667085', marginTop: 12, lineHeight: 1.5 }}>Suggested prices never go below your floor or above your ceiling. Prices are suggestions only. Nothing is sent to Airbnb or any other channel, so copy the ones you want into your channel manager.</div>
            {!sample && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <button onClick={save} disabled={saving || !Object.keys(draft).length} style={{ background: '#2F6DB5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !Object.keys(draft).length ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Save rules'}</button>
              {msg && <span style={{ fontSize: 13, color: msg === 'Saved.' ? '#027A48' : '#B42318' }}>{msg}</span>}
            </div>}
          </div>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Next 14 nights</div>
            {st.base_price == null && <div style={{ fontSize: 13, color: '#667085', marginBottom: 8 }}>Enter a base price to see suggestions.</div>}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {nights.map(n => <div key={n.date} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #F2F4F7', fontSize: 13 }}>
                <span style={{ width: 92, flexShrink: 0, color: '#344054' }}>{new Date(n.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span style={{ flex: 1, color: '#667085', minWidth: 0 }}>{n.reason}</span>
                <span style={{ fontWeight: 700, color: n.booked ? '#98A2B3' : '#323338' }}>{n.price != null ? `${c}${n.price.toLocaleString()}` : n.booked ? 'Booked' : '–'}</span>
              </div>)}
            </div>
          </div>
        </div>
      </>}

      {P.length > 0 && view === 'Performance' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          {[['Occupancy, last 30 days', pctTxt(perf.occupancy), `Before: ${pctTxt(perf.occupancyPrev)}`],
            ['Average nightly rate', perf.adr != null ? `${c}${Math.round(perf.adr).toLocaleString()}` : '–', 'Last 30 days'],
            ['Income, last 30 days', `${c}${Math.round(perf.income).toLocaleString()}`, `Before: ${c}${Math.round(perf.incomePrev).toLocaleString()}`],
            ['Booked, next 60 days', pctTxt(perf.bookedAhead), 'Of all nights']].map(([a, b, d]) =>
            <div key={a} style={card}><div style={lbl}>{a}</div><div style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 2px' }}>{b}</div><div style={{ fontSize: 12, color: '#667085' }}>{d}</div></div>)}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>By property, last 30 days</div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', color: '#667085' }}><th style={{ padding: '6px 8px' }}>Property</th><th style={{ padding: '6px 8px' }}>Occupancy</th><th style={{ padding: '6px 8px' }}>Avg rate</th><th style={{ padding: '6px 8px' }}>Income</th></tr></thead>
            <tbody>{perf.rows.map(r => <tr key={r.id} style={{ borderTop: '1px solid #F2F4F7' }}><td style={{ padding: '8px' }}>{r.name}</td><td style={{ padding: '8px' }}>{pctTxt(r.occupancy)}</td><td style={{ padding: '8px' }}>{r.adr != null ? `${c}${Math.round(r.adr).toLocaleString()}` : '–'}</td><td style={{ padding: '8px', fontWeight: 600 }}>{c}{Math.round(r.income).toLocaleString()}</td></tr>)}</tbody>
          </table></div>
          <div style={{ fontSize: 12, color: '#667085', marginTop: 10 }}>Worked out from the bookings in this portal. Each stay's total is spread evenly over its nights; cancelled stays are left out.</div>
        </div>
      </>}
    </div>
  )
}
