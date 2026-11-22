'use client'
// Vacation Rentals tabs and panels worked out from existing records:
// Guests, Direct Bookings, Reports figures (ADR, RevPAR, cancellations, channels, profitability), Needs attention tiles, booking history.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cur } from '@/lib/company-currency'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16, marginBottom: 12 }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #F2F4F7', flexWrap: 'wrap' }
const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { fontSize: 12, color: '#2F6DB5', background: '#fff', border: '1px solid #2F6DB5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }
const money = (n: number) => `${cur()}${Math.round(n || 0).toLocaleString()}`
const num = (v: any) => Number(v) || 0
const Empty = ({ t }: { t: string }) => <div style={{ textAlign: 'center', padding: 50, color: '#98A2B3', fontSize: 14 }}>{t}</div>
const nights = (b: any) => (b.check_in && b.check_out ? Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 864e5)) : 0)
const cancelled = (b: any) => String(b.status).toLowerCase().startsWith('cancel')

// ---------- Guests ----------
export function GuestsTab({ userId, bookings }: { userId: string; bookings: any[] }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [n, setN] = useState(0)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<any | null>(null)
  const [f, setF] = useState<any>({})
  useEffect(() => { if (!userId) return; supabase.from('str_guests').select('*').eq('user_id', userId).then(r => setProfiles(r.data ?? [])) }, [userId, n])
  const guests = useMemo(() => {
    const m: Record<string, any> = {}
    for (const b of bookings) {
      const key = String(b.guest_email || b.guest_name || '').trim().toLowerCase()
      if (!key) continue
      const g = (m[key] = m[key] ?? { key, name: b.guest_name, email: b.guest_email, phone: b.guest_phone, stays: 0, nights: 0, spend: 0, last: '', props: new Set<string>() })
      if (cancelled(b)) continue
      g.stays += 1; g.nights += nights(b); g.spend += num(b.total_amount)
      if (b.check_in && b.check_in > g.last) g.last = b.check_in
      if (b.properties?.name) g.props.add(b.properties.name)
      g.name = g.name || b.guest_name; g.email = g.email || b.guest_email; g.phone = g.phone || b.guest_phone
    }
    return Object.values(m).sort((a: any, b: any) => String(b.last).localeCompare(String(a.last)))
  }, [bookings])
  const prof = (k: string) => profiles.find(p => p.guest_key === k)
  const shown = guests.filter((g: any) => !q || `${g.name} ${g.email} ${g.phone}`.toLowerCase().includes(q.toLowerCase()))
  async function save() {
    await supabase.from('str_guests').upsert([{ user_id: userId, guest_key: edit.key, guest_name: edit.name, email: edit.email, phone: edit.phone, preferences: f.preferences || null, special_requests: f.special_requests || null, notes: f.notes || null, verified: !!f.verified }], { onConflict: 'user_id,guest_key' })
    setEdit(null); setN(x => x + 1)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {[['Guests', String(guests.length)], ['Repeat guests', String(guests.filter((g: any) => g.stays > 1).length)], ['Verified', String(profiles.filter(p => p.verified).length)]].map(([l, v]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '8px 14px' }}><div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89' }}>{v}</div></div>))}
        <input style={{ ...inp, width: 240, marginLeft: 'auto' }} placeholder="Search guests" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 70px 70px 110px 110px 90px', padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
            <span>Guest</span><span>Contact</span><span>Stays</span><span>Nights</span><span>Spend</span><span>Last stay</span><span></span>
          </div>
          {shown.length === 0 ? <Empty t="No guests yet. They appear from your bookings." /> : shown.map((g: any) => {
            const p = prof(g.key)
            return (
              <div key={g.key} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 70px 70px 110px 110px 90px', padding: '13px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, alignItems: 'center' }}>
                <span><b>{g.name ?? '—'}</b>{g.stays > 1 && <span style={{ marginLeft: 6, fontSize: 11, color: '#067647', fontWeight: 600 }}>Repeat</span>}{p?.verified && <span style={{ marginLeft: 6, fontSize: 11, color: '#2F6DB5', fontWeight: 600 }}>Verified</span>}</span>
                <span style={{ color: '#667085' }}>{g.email ?? g.phone ?? '—'}</span><span>{g.stays}</span><span>{g.nights}</span><span>{money(g.spend)}</span><span>{g.last || '—'}</span>
                <button style={btn} onClick={() => { setEdit(g); setF({ preferences: p?.preferences ?? '', special_requests: p?.special_requests ?? '', notes: p?.notes ?? '', verified: !!p?.verified }) }}>Profile</button>
              </div>)
          })}
        </div>
      </div>
      {edit && (
        <div onClick={() => setEdit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89', marginBottom: 4 }}>{edit.name}</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 14 }}>{edit.email ?? ''} {edit.phone ?? ''} · {edit.stays} stays · {edit.nights} nights · {money(edit.spend)} · {[...edit.props].join(', ')}</div>
            {[['preferences', 'Preferences'], ['special_requests', 'Special requests'], ['notes', 'Notes']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4 }}>{l}</label>
                <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>))}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16 }}><input type="checkbox" checked={!!f.verified} onChange={e => setF({ ...f, verified: e.target.checked })} /> ID verified</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={save} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#2F6DB5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEdit(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>)}
    </div>
  )
}

// ---------- Direct Bookings ----------
export function DirectBookings({ propertyIds, properties }: { propertyIds: string[]; properties: any[] }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    if (!propertyIds.length) { setRows([]); return }
    supabase.from('direct_bookings').select('*').in('property_id', propertyIds).order('created_at', { ascending: false }).then(r => setRows(r.data ?? []))
  }, [propertyIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <Empty t="Loading…" />
  const paid = rows.filter(r => ['paid', 'confirmed', 'complete', 'completed'].includes(String(r.status).toLowerCase()))
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[['Direct bookings', String(rows.length)], ['Paid', String(paid.length)], ['Paid value', money(paid.reduce((s, r) => s + num(r.total), 0))]].map(([l, v]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '8px 14px' }}><div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89' }}>{v}</div></div>))}
      </div>
      <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 110px 110px 70px 110px 100px', padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase' }}>
            <span>Guest</span><span>Property</span><span>Check in</span><span>Check out</span><span>Nights</span><span>Total</span><span>Status</span>
          </div>
          {rows.length === 0 ? <Empty t="No direct bookings yet. They arrive from your booking page." /> : rows.map(r => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 110px 110px 70px 110px 100px', padding: '13px 20px', borderBottom: '1px solid #F2F4F7', fontSize: 13, alignItems: 'center' }}>
              <span><b>{r.guest_name ?? '—'}</b><div style={{ fontSize: 11, color: '#98A2B3' }}>{r.guest_email}</div></span>
              <span>{properties.find(p => p.id === r.property_id)?.name ?? '—'}</span><span>{r.check_in ?? '—'}</span><span>{r.check_out ?? '—'}</span><span>{r.nights ?? '—'}</span><span>{money(num(r.total))}</span><span>{r.status}</span>
            </div>))}
        </div>
      </div>
    </div>
  )
}

// ---------- Reports figures ----------
export function StrKpis({ bookings, properties, expenses }: { bookings: any[]; properties: any[]; expenses: any[] }) {
  const [period, setPeriod] = useState(90)
  const from = new Date(Date.now() - period * 864e5).toISOString().slice(0, 10)
  const inP = bookings.filter(b => b.check_in && b.check_in >= from)
  const live = inP.filter(b => !cancelled(b))
  const rev = live.reduce((s, b) => s + num(b.total_amount), 0)
  const nts = live.reduce((s, b) => s + nights(b), 0)
  const avail = Math.max(1, properties.length * period)
  const canc = inP.length ? (inP.filter(cancelled).length / inP.length) * 100 : 0
  const byPlat: Record<string, { n: number; nights: number; rev: number }> = {}
  live.forEach(b => { const k = b.platform || b.source || 'Direct / other'; const p = (byPlat[k] = byPlat[k] ?? { n: 0, nights: 0, rev: 0 }); p.n += 1; p.nights += nights(b); p.rev += num(b.total_amount) })
  const perProp = properties.map(p => {
    const bs = live.filter(b => b.property_id === p.id)
    const r = bs.reduce((s, b) => s + num(b.total_amount), 0)
    const cost = expenses.filter(e => e.date && e.date >= from && e.property_name && e.property_name === p.name).reduce((s, e) => s + num(e.amount), 0)
    return { name: p.name, rev: r, nights: bs.reduce((s, b) => s + nights(b), 0), cost }
  })
  const tiles = [['Occupancy', `${Math.min(100, Math.round((nts / avail) * 100))}%`], ['ADR (average daily rate)', nts ? money(rev / nts) : '—'], ['RevPAR', money(rev / avail)], ['Cancellation rate', `${canc.toFixed(1)}%`], ['Revenue', money(rev)], ['Bookings', String(live.length)]]
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={h}>Performance figures</div>
        <select style={{ ...inp, width: 190 }} value={period} onChange={e => setPeriod(Number(e.target.value))}>
          <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10, marginBottom: 12 }}>
        {tiles.map(([l, v]) => (<div key={l} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '12px 14px' }}><div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 800, color: '#1D4E89' }}>{v}</div></div>))}
      </div>
      <div style={card}><div style={h}>Channel performance (by booking source)</div>
        {Object.keys(byPlat).length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No bookings in this period.</div> : Object.entries(byPlat).map(([k, v]) => <div key={k} style={row}><span>{k}</span><b>{v.n} bookings · {v.nights} nights · {money(v.rev)}</b></div>)}
      </div>
      <div style={card}><div style={h}>Property profitability (revenue less expenses tagged to the property)</div>
        {perProp.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No properties yet.</div> : perProp.map(p => <div key={p.name} style={row}><span>{p.name}</span><b>{money(p.rev)} revenue · {money(p.cost)} costs · {money(p.rev - p.cost)}</b></div>)}
        <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 8 }}>Costs only include expenses where the property is named on the expense.</div>
      </div>
    </div>
  )
}

// ---------- Needs attention (Home) ----------
export function StrGlance({ userId, bookings, maintenance, reviews, go }: { userId: string; bookings: any[]; maintenance: any[]; reviews: any[]; go: (tab: string) => void }) {
  const [d, setD] = useState<any[][] | null>(null)
  useEffect(() => { if (!userId) return; (async () => {
    const res = await Promise.all(['str_requests', 'str_inventory', 'str_inspections', 'str_laundry'].map(t => supabase.from(t).select('*').eq('user_id', userId)))
    setD(res.map(r => r.data ?? []))
  })() }, [userId])
  if (!d) return null
  const [reqs, inv, insp, laundry] = d
  const today = new Date().toISOString().slice(0, 10)
  const lowStock = inv.filter(x => x.reorder_level != null && num(x.quantity) <= num(x.reorder_level)).length
  const openReq = reqs.filter(x => ['Open', 'In progress'].includes(x.status))
  const tiles: { label: string; value: string; sub: string; tab: string; warn?: boolean }[] = [
    { label: 'Check-ins today', value: String(bookings.filter(b => b.check_in === today && !cancelled(b)).length), sub: 'arriving today', tab: 'Bookings' },
    { label: 'Check-outs today', value: String(bookings.filter(b => b.check_out === today && !cancelled(b)).length), sub: 'departing today', tab: 'Bookings' },
    { label: 'Guest requests', value: String(openReq.length), sub: 'open requests and complaints', tab: 'Guest Requests', warn: openReq.some(x => x.kind === 'Complaint') },
    { label: 'Maintenance', value: String(maintenance.filter(m => m.status === 'open').length), sub: 'open tickets', tab: 'Maintenance' },
    { label: 'Low stock', value: String(lowStock), sub: 'items to reorder', tab: 'Inventory', warn: lowStock > 0 },
    { label: 'Inspections', value: String(insp.filter(x => x.status !== 'Done').length), sub: 'planned or needing follow-up', tab: 'Inspections' },
    { label: 'Laundry', value: String(laundry.filter(x => x.status === 'Sent').length), sub: 'loads out', tab: 'Linen & Laundry' },
    { label: 'Reviews', value: String(reviews.filter(r => !r.responded && parseFloat(r.rating) <= 3).length), sub: 'low ratings to answer', tab: 'Reviews', warn: reviews.some(r => !r.responded && parseFloat(r.rating) <= 3) },
  ]
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={h}>Needs attention</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
        {tiles.map(t => (
          <button key={t.label} onClick={() => go(t.tab)} style={{ textAlign: 'left', background: '#fff', border: `1px solid ${t.warn ? '#FDA29B' : '#E4E7EC'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', fontWeight: 600 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.warn ? '#B42318' : '#1D4E89' }}>{t.value}</div>
            <div style={{ fontSize: 11, color: '#98A2B3' }}>{t.sub}</div>
          </button>))}
      </div>
    </div>
  )
}

// ---------- Booking history ----------
export function BookingHistory({ userId, booking, onClose }: { userId: string; booking: any; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => { supabase.from('str_booking_changes').select('*').eq('booking_id', booking.id).order('created_at', { ascending: false }).then(r => setRows(r.data ?? [])) }, [booking.id, n])
  async function add() {
    if (!note.trim()) return
    await supabase.from('str_booking_changes').insert([{ user_id: userId, booking_id: booking.id, note: note.trim() }])
    setNote(''); setN(x => x + 1)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1D4E89' }}>Booking history</div>
        <div style={{ fontSize: 12, color: '#667085', margin: '4px 0 14px' }}>{booking.guest_name} · {booking.properties?.name} · {booking.check_in} to {booking.check_out} · {booking.status}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={inp} placeholder="Record a change (dates moved, guests added, refund agreed)" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <button style={{ ...btn, background: '#2F6DB5', color: '#fff' }} onClick={add}>Add</button>
        </div>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: '#98A2B3' }}>No changes recorded.</div> : rows.map(r => <div key={r.id} style={row}><span>{r.note}</span><span style={{ color: '#98A2B3' }}>{String(r.created_at).slice(0, 16).replace('T', ' ')}</span></div>)}
        <button onClick={onClose} style={{ marginTop: 16, width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 14, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  )
}
