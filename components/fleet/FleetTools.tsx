'use client'
// Fleet and Rides dashboard and earnings import (NOVOURQ own company only).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cur } from '@/lib/company-currency'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 16 }
const num = (v: any) => Number(v || 0)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)

function useFleet(userId: string) {
  const [d, setD] = useState<{ v: any[]; e: any[]; x: any[]; docs: any[]; svc: any[]; drv: any[]; pay: any[] }>({ v: [], e: [], x: [], docs: [], svc: [], drv: [], pay: [] })
  const [loading, setLoading] = useState(true)
  async function load() {
    if (!userId) return
    const q = (t: string) => supabase.from(t).select('*').eq('user_id', userId)
    const [v, e, x, docs, svc, drv, pay] = await Promise.all(['fleet_vehicles', 'fleet_earnings', 'fleet_expenses', 'fleet_documents', 'fleet_service', 'fleet_drivers', 'fleet_payments'].map(q))
    setD({ v: v.data ?? [], e: e.data ?? [], x: x.data ?? [], docs: docs.data ?? [], svc: svc.data ?? [], drv: drv.data ?? [], pay: pay.data ?? [] })
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [userId])
  return { ...d, loading, reload: load }
}

export function FleetDashboard({ userId, go }: { userId: string; go: (t: string) => void }) {
  const { v, e, x, docs, svc, drv, pay, loading } = useFleet(userId)
  const today = iso(new Date())
  const weekStart = iso(new Date(Date.now() - 6 * 86400000))
  const k = useMemo(() => {
    const inWeek = (s: string | null) => !!s && s >= weekStart && s <= today
    const earnedWeek = e.filter(r => inWeek(r.period_end)).reduce((a, r) => a + num(r.net || r.gross), 0)
    const earnedToday = e.filter(r => r.period_end === today).reduce((a, r) => a + num(r.net || r.gross), 0)
    const costWeek = x.filter(r => inWeek(r.expense_date)).reduce((a, r) => a + num(r.amount), 0)
    const owed = pay.reduce((a, r) => a + Math.max(0, num(r.amount_due) - num(r.amount_paid)), 0)
    const expiring = [
      ...docs.filter(r => r.expiry_date && days(r.expiry_date, today) <= 30).map(r => ({ what: `${r.kind}: ${r.title}`, date: r.expiry_date })),
      ...drv.filter(r => r.status !== 'Left').flatMap(r => [['Licence', r.licence_expiry], ['Taxi badge', r.badge_expiry]].filter(([, dt]) => dt && days(dt as string, today) <= 30).map(([n, dt]) => ({ what: `${n}: ${r.driver_name}`, date: dt as string }))),
    ].sort((a, b) => a.date.localeCompare(b.date))
    const due = [
      ...svc.filter(r => r.status !== 'Done' && r.next_due_date && days(r.next_due_date, today) <= 14).map(r => ({ what: `${r.kind} due`, date: r.next_due_date, veh: v.find(z => z.id === r.vehicle_id)?.name })),
      ...v.filter(r => r.status !== 'Sold' && r.next_service_km && r.odometer_km && num(r.next_service_km) - num(r.odometer_km) <= 500).map(r => ({ what: 'Service due by distance', date: today, veh: r.name })),
    ]
    const byVeh = v.filter(r => r.status !== 'Sold').map(r => {
      const cost = num(r.purchase_price) + num(r.import_duty) + num(r.other_costs)
      const income = e.filter(z => z.vehicle_id === r.id).reduce((a, z) => a + num(z.net || z.gross), 0)
      const spend = x.filter(z => z.vehicle_id === r.id).reduce((a, z) => a + num(z.amount), 0) + svc.filter(z => z.vehicle_id === r.id).reduce((a, z) => a + num(z.cost), 0)
      return { r, cost, profit: income - spend, paid: cost ? Math.max(0, Math.min(100, ((income - spend) / cost) * 100)) : 0 }
    })
    const byDriver: Record<string, number> = {}
    e.filter(r => inWeek(r.period_end)).forEach(r => { const n = r.driver_name || 'Unassigned'; byDriver[n] = (byDriver[n] ?? 0) + num(r.net || r.gross) })
    return { earnedWeek, earnedToday, costWeek, owed, expiring, due, byVeh, byDriver }
  }, [v, e, x, docs, svc, drv, pay, today, weekStart])
  if (loading) return <div style={{ padding: 24, color: '#667085' }}>Loading…</div>
  const s = cur()
  const tile = (label: string, value: string, tone?: string, to?: string) => (
    <button onClick={() => to && go(to)} style={{ ...card, textAlign: 'left', cursor: to ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 12, color: '#667085' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: tone ?? '#1D4E89', marginTop: 4 }}>{value}</div>
    </button>
  )
  const maxD = Math.max(1, ...Object.values(k.byDriver))
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
        {tile('Cars on the road', String(v.filter(r => r.status === 'On the road').length), '#067647', 'Vehicles')}
        {tile('Earned today', `${s}${k.earnedToday.toLocaleString()}`, undefined, 'Earnings')}
        {tile('Earned, last 7 days', `${s}${k.earnedWeek.toLocaleString()}`, undefined, 'Earnings')}
        {tile('Costs, last 7 days', `${s}${k.costWeek.toLocaleString()}`, '#B54708', 'Expenses')}
        {tile('Net, last 7 days', `${s}${(k.earnedWeek - k.costWeek).toLocaleString()}`, k.earnedWeek - k.costWeek < 0 ? '#B42318' : '#067647')}
        {tile('Owed by drivers', `${s}${k.owed.toLocaleString()}`, k.owed ? '#B54708' : '#067647', 'Driver Payments')}
      </div>
      {(k.expiring.length > 0 || k.due.length > 0) && (
        <div style={{ ...card, borderColor: '#FEC84B', background: '#FFFAEB' }}>
          <div style={{ fontWeight: 600, color: '#B54708', marginBottom: 8 }}>Needs attention</div>
          {k.expiring.slice(0, 8).map((r, i) => <button key={'x' + i} onClick={() => go('Documents')} style={{ display: 'block', background: 'none', border: 0, padding: '2px 0', fontSize: 13, cursor: 'pointer', color: '#344054', fontFamily: 'inherit' }}>{r.what} expires {r.date}{days(r.date, today) < 0 ? ' (overdue)' : ''}</button>)}
          {k.due.slice(0, 6).map((r, i) => <button key={'d' + i} onClick={() => go('Service')} style={{ display: 'block', background: 'none', border: 0, padding: '2px 0', fontSize: 13, cursor: 'pointer', color: '#344054', fontFamily: 'inherit' }}>{r.veh ?? 'Vehicle'}: {r.what}{r.date ? ` (${r.date})` : ''}</button>)}
        </div>
      )}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10, color: '#1D4E89' }}>Vehicles and payback</div>
        {k.byVeh.length === 0 && <div style={{ color: '#667085', fontSize: 13 }}>No vehicles yet. Add your first car under Vehicles.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 12 }}>
          {k.byVeh.map(({ r, cost, profit, paid }) => (
            <div key={r.id} style={{ border: '1px solid #E4E7EC', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{r.name}</b><span style={{ fontSize: 12, color: '#475467' }}>{r.status}</span></div>
              <div style={{ fontSize: 12, color: '#667085', margin: '4px 0 8px' }}>{r.driver_name ? `Driver: ${r.driver_name}` : 'No driver assigned'}</div>
              <div style={{ height: 6, background: '#EAECF0', borderRadius: 3 }}><div style={{ width: `${paid}%`, height: 6, background: '#12B76A', borderRadius: 3 }} /></div>
              <div style={{ fontSize: 12, color: '#475467', marginTop: 6 }}>{s}{profit.toLocaleString()} profit so far of {s}{cost.toLocaleString()} cost in ({Math.round(paid)}% paid back)</div>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10, color: '#1D4E89' }}>Earnings by driver, last 7 days</div>
        {Object.keys(k.byDriver).length === 0 && <div style={{ color: '#667085', fontSize: 13 }}>No earnings in the last 7 days.</div>}
        {Object.entries(k.byDriver).sort((a, b) => b[1] - a[1]).map(([n, val]) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px', gap: 10, alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
            <span>{n}</span><div style={{ height: 8, background: '#EAECF0', borderRadius: 4 }}><div style={{ width: `${(val / maxD) * 100}%`, height: 8, background: '#2F6DB5', borderRadius: 4 }} /></div><span style={{ textAlign: 'right' }}>{s}{val.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Earnings import: paste or upload a CSV with a header row.
// Columns (any order): date or period_end, period_start, plate or registration, driver, platform, gross, fees, tips, net.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let cur = '', row: string[] = [], q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim())) rows.push(row); row = [] }
    else cur += c
  }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row)
  return rows
}

export function EarningsImport({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true); setMsg('')
    const rows = parseCsv(text)
    if (rows.length < 2) { setMsg('Paste a header row and at least one line.'); setBusy(false); return }
    const head = rows[0].map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    const col = (...n: string[]) => head.findIndex(h => n.includes(h))
    const ci = { end: col('date', 'period_end', 'to'), start: col('period_start', 'from', 'date'), plate: col('plate', 'registration', 'vehicle'), drv: col('driver', 'driver_name'), plat: col('platform'), gross: col('gross', 'fare', 'earnings'), fee: col('fees', 'platform_fee', 'fee'), tips: col('tips', 'tip'), net: col('net', 'net_earnings') }
    if (ci.end < 0) { setMsg('Needs a date column (date or period_end).'); setBusy(false); return }
    const { data: vs } = await supabase.from('fleet_vehicles').select('id,registration').eq('user_id', userId)
    const byPlate = new Map((vs ?? []).map(z => [String(z.registration ?? '').replace(/\s/g, '').toUpperCase(), z.id]))
    const g = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
    const n = (r: string[], i: number) => { const x = g(r, i).replace(/[^0-9.\-]/g, ''); return x === '' ? null : Number(x) }
    const out: any[] = []; let unmatched = 0
    for (const r of rows.slice(1)) {
      const end = g(r, ci.end); if (!/^\d{4}-\d{2}-\d{2}/.test(end)) continue
      const plate = g(r, ci.plate).replace(/\s/g, '').toUpperCase()
      const vid = plate ? byPlate.get(plate) ?? null : null
      if (plate && !vid) unmatched++
      const gross = n(r, ci.gross), fee = n(r, ci.fee), tips = n(r, ci.tips)
      out.push({ user_id: userId, vehicle_id: vid, driver_name: g(r, ci.drv) || null, platform: g(r, ci.plat) || 'Uber', period_start: (g(r, ci.start) || end).slice(0, 10), period_end: end.slice(0, 10), gross, platform_fee: fee, tips, net: n(r, ci.net) ?? (gross != null ? gross - (fee ?? 0) + (tips ?? 0) : null), source: 'CSV import' })
    }
    if (!out.length) { setMsg('No usable lines found. Dates must look like 2026-11-22.'); setBusy(false); return }
    const { error } = await supabase.from('fleet_earnings').insert(out)
    setBusy(false)
    if (error) { setMsg('Could not import: ' + error.message); return }
    setMsg(`Imported ${out.length} line${out.length === 1 ? '' : 's'}${unmatched ? `, ${unmatched} with a plate that matches no vehicle` : ''}.`); setText(''); onDone()
  }
  return (
    <div style={{ margin: '12px 24px 0' }}>
      <button onClick={() => setOpen(!open)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #2F6DB5', background: '#fff', color: '#1D4E89', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>{open ? 'Close import' : 'Import statement (CSV)'}</button>
      {open && (
        <div style={{ ...card, marginTop: 10 }}>
          <div style={{ fontSize: 13, color: '#475467', marginBottom: 8 }}>Paste a CSV with a header row. Columns: date, plate, driver, platform, gross, fees, tips, net (net is worked out if left out). Plates must match a vehicle registration. Uber statements are entered this way until a live Uber link is approved.</div>
          <input type="file" accept=".csv,text/csv" onChange={async e => { const f = e.target.files?.[0]; if (f) setText(await f.text()) }} style={{ marginBottom: 8, fontSize: 13 }} />
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder={'date,plate,driver,platform,gross,fees,tips\n2026-11-21,1234AB,Marcus,Uber,18500,4625,500'} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <button disabled={busy || !text.trim()} onClick={run} style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#2F6DB5', color: '#fff', cursor: 'pointer', fontSize: 13, opacity: busy || !text.trim() ? 0.5 : 1 }}>{busy ? 'Importing…' : 'Import'}</button>
            {msg && <span style={{ fontSize: 13, color: msg.startsWith('Imported') ? '#067647' : '#B42318' }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
