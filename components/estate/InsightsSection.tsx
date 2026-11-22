'use client'
// Estate Agency reports built from existing records: marketing analytics, lettings reports, property performance.
import { useEffect, useState } from 'react'
import { supabase, getAccountId } from '../../lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '5px 0', borderBottom: '1px solid #F2F4F7' }
const PERIODS: [string, number | null][] = [['All time', null], ['Last 12 months', 365], ['Last 90 days', 90], ['Last 30 days', 30]]

export default function InsightsSection({ kind, properties }: { kind: 'marketing' | 'lettings' | 'performance'; properties: any[] }) {
  const [d, setD] = useState<any>(null)
  const [days, setDays] = useState<number | null>(null)
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const uid = await getAccountId(user)
    const q = (t: string) => supabase.from(t).select('*').eq('user_id', uid)
    const [v, o, c, t, m, r] = await Promise.all([q('estate_viewings'), q('estate_offers'), q('estate_contacts'), q('estate_tenancies'), q('estate_maintenance'), q('estate_rent_schedules')])
    setD({ v: v.data ?? [], o: o.data ?? [], c: c.data ?? [], t: t.data ?? [], m: m.data ?? [], r: r.data ?? [] })
  })() }, [])
  if (!d) return <div style={{ padding: 40, textAlign: 'center', color: '#98A2B3' }}>Loading…</div>

  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : ''
  const inR = (x: any) => !since || (x.created_at ?? '') >= since
  const v = d.v.filter(inR), o = d.o.filter(inR), c = d.c.filter(inR)
  const pname = (id: string) => properties.find(p => p.id === id)?.name ?? 'Unknown property'
  const cur = (id: string) => properties.find(p => p.id === id)?.currency || 'JMD'
  const sym = (cc: string) => (CURRENCIES[cc] ?? CURRENCIES.JMD).symbol
  const count = (rows: any[], key: (x: any) => string) => { const m: Record<string, number> = {}; rows.forEach(x => { const k = key(x) || 'Not recorded'; m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }
  const List = ({ title, items }: { title: string; items: [string, string | number][] }) => (
    <div style={card}><div style={h}>{title}</div>{items.length ? items.map(([k, n]) => <div key={k} style={row}><span>{k}</span><b>{n}</b></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>Nothing yet</div>}</div>)
  const Big = ({ t, n }: { t: string; n: string | number }) => <div style={card}><div style={{ fontSize: 12, color: '#667085' }}>{t}</div><div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{n}</div></div>
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 12 }

  const picker = kind === 'lettings' ? null : (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>{PERIODS.map(([l, n]) => <button key={l} onClick={() => setDays(n)} style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: days === n ? '1px solid #2F6DB5' : '1px solid #E4E7EC', background: days === n ? '#DCE9F8' : '#F7F8FA', color: days === n ? '#1D4E89' : '#344054' }}>{l}</button>)}</div>)

  if (kind === 'marketing') {
    const interested = v.filter((x: any) => x.interested === 'Yes').length
    return <div>{picker}
      <div style={grid}><Big t="New contacts" n={c.length} /><Big t="Viewing requests" n={v.length} /><Big t="Offers received" n={o.length} /><Big t="Viewings that led to interest" n={interested} /></div>
      <div style={grid}>
        <List title="Where contacts come from" items={count(c, x => x.source)} />
        <List title="Where viewing requests come from" items={count(v, x => x.source)} />
        <List title="Most viewed properties" items={count(v, x => pname(x.property_id)).slice(0, 8)} />
        <List title="Most offers by property" items={count(o, x => pname(x.property_id)).slice(0, 8)} />
      </div></div>
  }

  if (kind === 'lettings') {
    const active = d.t.filter((x: any) => /active|current/i.test(x.status ?? ''))
    const in90 = Date.now() + 90 * 864e5
    const ending = active.filter((x: any) => x.end_date && new Date(x.end_date).getTime() <= in90)
    const rent: Record<string, number> = {}; active.forEach((x: any) => { const cc = cur(x.property_id); rent[cc] = (rent[cc] || 0) + (Number(x.rent) || 0) })
    const overdue = d.r.filter((x: any) => x.status === 'Overdue').length
    const let_ = new Set(active.map((x: any) => x.property_id))
    const lettable = properties.filter(p => !p.for_sale)
    return <div>
      <div style={grid}><Big t="Active tenancies" n={active.length} /><Big t="Ending in 90 days" n={ending.length} /><Big t="Overdue rent schedules" n={overdue} /><Big t="Properties to let with no tenancy" n={lettable.filter(p => !let_.has(p.id)).length} /></div>
      <div style={grid}>
        <div style={card}><div style={h}>Monthly rent roll</div>{Object.keys(rent).length ? Object.entries(rent).map(([cc, n]) => <div key={cc} style={row}><span>{cc}</span><b>{sym(cc)}{n.toLocaleString()}</b></div>) : <div style={{ fontSize: 13, color: '#98A2B3' }}>No active tenancies</div>}</div>
        <List title="Tenancies by status" items={count(d.t, (x: any) => x.status)} />
        <List title="Tenancies ending soon" items={ending.map((x: any) => [pname(x.property_id), x.end_date] as [string, string])} />
        <List title="Rent schedules by status" items={count(d.r, (x: any) => x.status)} />
      </div></div>
  }

  // property performance
  const rows = properties.map(p => {
    const vs = d.v.filter((x: any) => x.property_id === p.id), os = d.o.filter((x: any) => x.property_id === p.id)
    const ms = d.m.filter((x: any) => x.property_id === p.id), ts = d.t.filter((x: any) => x.property_id === p.id && /active|current/i.test(x.status ?? ''))
    const cost = ms.reduce((a: number, x: any) => a + (Number(x.cost) || 0), 0)
    const rent = ts.reduce((a: number, x: any) => a + (Number(x.rent) || 0), 0)
    return { p, viewings: vs.length, offers: os.length, issues: ms.length, cost, rent, let: ts.length > 0 }
  }).sort((a, b) => b.viewings - a.viewings)
  return <div style={card}>
    <div style={h}>Each property</div>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
      <thead><tr style={{ textAlign: 'left', color: '#667085' }}><th style={{ padding: '6px 8px' }}>Property</th><th>Let now</th><th>Monthly rent</th><th>Viewings</th><th>Offers</th><th>Repairs</th><th>Repair cost</th></tr></thead>
      <tbody>{rows.map(r => { const s = sym(r.p.currency || 'JMD'); return <tr key={r.p.id} style={{ borderTop: '1px solid #F2F4F7' }}><td style={{ padding: '8px', fontWeight: 600 }}>{r.p.name}</td><td>{r.let ? 'Yes' : 'No'}</td><td>{r.rent ? s + r.rent.toLocaleString() : '—'}</td><td>{r.viewings}</td><td>{r.offers}</td><td>{r.issues}</td><td>{r.cost ? s + r.cost.toLocaleString() : '—'}</td></tr> })}</tbody>
    </table></div>
    {!rows.length && <div style={{ fontSize: 13, color: '#98A2B3' }}>No properties yet</div>}
  </div>
}
