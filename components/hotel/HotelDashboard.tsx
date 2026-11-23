'use client'
// Hotels → Executive Dashboard: the whole hotel today, worked out from rooms and reservations (NOVOURQ own company only).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const num = (v: any) => Number(v || 0)
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }
const clean = (s: string) => s === 'Clean' || s === 'Inspected'

export default function HotelDashboard({ userId, go }: { userId: string; go: (t: string) => void }) {
  const [rooms, setRooms] = useState<any[]>([]), [res, setRes] = useState<any[]>([]), [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('hotel_rooms').select('*').eq('user_id', userId),
      supabase.from('hotel_reservations').select('*').eq('user_id', userId),
    ]).then(([a, b]) => { setRooms(a.data ?? []); setRes(b.data ?? []); setLoading(false) })
  }, [userId])
  const today = iso(new Date())
  const k = useMemo(() => {
    const roomName = (id: string) => rooms.find(r => r.id === id)?.room_number ?? '—'
    const inHouse = res.filter(r => r.status === 'Checked in')
    const arrivals = res.filter(r => r.check_in === today && ['Confirmed', 'Pending'].includes(r.status))
    const departures = res.filter(r => r.check_out === today && r.status === 'Checked in')
    const sellable = rooms.filter(r => r.status !== 'Out of order').length
    const dirty = rooms.filter(r => r.status !== 'Out of order' && !clean(r.housekeeping))
    const owing = res.filter(r => ['Checked in', 'Checked out'].includes(r.status) && num(r.total) - num(r.paid) > 0)
    const owed = owing.reduce((a, r) => a + num(r.total) - num(r.paid), 0)
    return { roomName, inHouse, arrivals, departures, sellable, dirty, owing, owed, out: rooms.filter(r => r.status === 'Out of order'), occ: sellable ? Math.round((inHouse.length / sellable) * 100) : 0 }
  }, [rooms, res, today])
  if (loading) return <div style={{ padding: 28, color: '#667085' }}>Loading…</div>
  const tile = (label: string, value: string, tab?: string, tone?: 'warn' | 'ok') => (
    <button key={label} onClick={() => tab && go(tab)} style={{ ...card, textAlign: 'left', cursor: tab ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 12, color: '#667085' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: tone === 'warn' ? '#B54708' : tone === 'ok' ? '#027A48' : '#1D4E89', marginTop: 2 }}>{value}</div>
    </button>
  )
  const list = (title: string, rows: { a: string; b: string }[], empty: string, tab: string) => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><b style={{ fontSize: 14, color: '#1D4E89' }}>{title}</b><button onClick={() => go(tab)} style={{ background: 'none', border: 0, color: '#2F6DB5', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>Open</button></div>
      {rows.length ? rows.slice(0, 6).map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, padding: '6px 0', borderTop: i ? '1px solid #F2F4F7' : 'none' }}><span>{r.a}</span><span style={{ color: '#667085' }}>{r.b}</span></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>{empty}</div>}
    </div>
  )
  return (
    <div style={{ padding: 28, display: 'grid', gap: 16 }}>
      {!rooms.length && <div style={{ ...card, background: '#F5F9FE', borderColor: '#C9DEF3', fontSize: 14, color: '#344054' }}>Start by adding your rooms under <b>Room Inventory</b>. The dashboard fills in as you add rooms and reservations.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {tile('Rooms', String(rooms.length), 'Room Inventory')}
        {tile('Occupancy tonight', `${k.occ}%`, 'Reservations & Bookings')}
        {tile('In house', String(k.inHouse.length), 'Reservations & Bookings', 'ok')}
        {tile('Arriving today', String(k.arrivals.length), 'Reservations & Bookings')}
        {tile('Leaving today', String(k.departures.length), 'Reservations & Bookings')}
        {tile('Rooms to clean', String(k.dirty.length), 'Room Inventory', k.dirty.length ? 'warn' : 'ok')}
        {tile('Out of order', String(k.out.length), 'Room Inventory', k.out.length ? 'warn' : undefined)}
        {tile('Unpaid balances', `${k.owed.toLocaleString()}`, 'Reservations & Bookings', k.owed ? 'warn' : 'ok')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
        {list('Arriving today', k.arrivals.map(r => ({ a: r.guest_name, b: r.room_id ? 'Room ' + k.roomName(r.room_id) : 'No room yet' })), 'No arrivals today.', 'Reservations & Bookings')}
        {list('Leaving today', k.departures.map(r => ({ a: r.guest_name, b: r.room_id ? 'Room ' + k.roomName(r.room_id) : '' })), 'No departures today.', 'Reservations & Bookings')}
        {list('Rooms to clean', k.dirty.map(r => ({ a: 'Room ' + r.room_number, b: r.housekeeping })), 'Every room is clean.', 'Room Inventory')}
        {list('Balances to collect', k.owing.map(r => ({ a: r.guest_name, b: (num(r.total) - num(r.paid)).toLocaleString() })), 'Nothing owed.', 'Reservations & Bookings')}
      </div>
    </div>
  )
}
