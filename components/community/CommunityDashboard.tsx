'use client'
// Gated Communities → Dashboard: the whole community today, worked out from units, residents, visitors, repairs and complaints.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = Record<string, any>
const iso = (d: Date) => d.toISOString().slice(0, 10)
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }

export default function CommunityDashboard({ userId, go }: { userId: string; go: (t: string) => void }) {
  const [d, setD] = useState<Record<string, Row[]>>({}), [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) return
    const t = ['community_units', 'community_residents', 'community_visitors', 'community_maintenance', 'community_complaints']
    Promise.all(t.map(x => supabase.from(x).select('*').eq('user_id', userId))).then(r => { const o: Record<string, Row[]> = {}; t.forEach((x, i) => { o[x] = r[i].data ?? [] }); setD(o); setLoading(false) })
  }, [userId])
  const today = iso(new Date())
  const k = useMemo(() => {
    const units = d.community_units ?? [], res = (d.community_residents ?? []).filter(r => r.status === 'Active'), vis = d.community_visitors ?? []
    const mt = (d.community_maintenance ?? []).filter(r => r.status !== 'Done'), cp = (d.community_complaints ?? []).filter(r => ['Open', 'Investigating'].includes(r.status))
    const un = (id: string) => units.find(u => u.id === id)?.name ?? ''
    return {
      units, res, mt, cp, un,
      occupied: units.filter(u => ['Owner occupied', 'Rented'].includes(u.status)).length, vacant: units.filter(u => u.status === 'Vacant').length,
      owners: res.filter(r => r.resident_type === 'Homeowner').length, tenants: res.filter(r => r.resident_type === 'Tenant').length,
      expected: vis.filter(v => v.expected_date === today && v.status === 'Expected'), onsite: vis.filter(v => v.status === 'On site'),
      urgent: mt.filter(r => ['Emergency', 'High'].includes(r.priority)),
    }
  }, [d, today])
  if (loading) return <div style={{ padding: 28, color: '#667085' }}>Loading…</div>
  const tile = (label: string, value: number, tab: string, tone?: 'warn' | 'ok') => (
    <button key={label} onClick={() => go(tab)} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
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
      {!k.units.length && <div style={{ ...card, background: '#F5F9FE', borderColor: '#C9DEF3', fontSize: 14, color: '#344054' }}>Start by adding your homes under <b>Property & Unit Management</b>, then your residents. The dashboard fills in as you go.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {tile('Residential units', k.units.length, 'Property & Unit Management')}
        {tile('Occupied', k.occupied, 'Property & Unit Management')}
        {tile('Vacant', k.vacant, 'Property & Unit Management', k.vacant ? 'warn' : undefined)}
        {tile('Registered residents', k.res.length, 'Homeowner & Resident Management')}
        {tile('Homeowners', k.owners, 'Homeowner & Resident Management')}
        {tile('Tenants', k.tenants, 'Homeowner & Resident Management')}
        {tile('Visitors expected today', k.expected.length, 'Visitor Management')}
        {tile('Visitors on site', k.onsite.length, 'Visitor Management', 'ok')}
        {tile('Open repairs', k.mt.length, 'Maintenance & Repairs', k.urgent.length ? 'warn' : undefined)}
        {tile('Open complaints', k.cp.length, 'Complaints & Resident Relations', k.cp.length ? 'warn' : 'ok')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
        {list('Visitors expected today', k.expected.map(v => ({ a: v.visitor_name, b: k.un(v.unit_id) || v.visitor_type })), 'None expected today.', 'Visitor Management')}
        {list('Visitors on site now', k.onsite.map(v => ({ a: v.visitor_name, b: k.un(v.unit_id) || v.visitor_type })), 'Nobody on site.', 'Visitor Management')}
        {list('Urgent repairs', k.urgent.map(r => ({ a: r.title, b: r.priority })), 'No urgent repairs.', 'Maintenance & Repairs')}
        {list('Open complaints', k.cp.map(r => ({ a: r.title, b: r.category ?? '' })), 'No open complaints.', 'Complaints & Resident Relations')}
      </div>
    </div>
  )
}
