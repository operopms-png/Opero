'use client'
// Staff Centre → Human Intelligence Hub → Company → KPI Tracker.
// The numbers that show whether the business is on track. Some are worked out from the portal, the rest are typed in monthly.
import React, { useCallback, useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { fmt, type Kpi, type Unit } from '@/lib/kpi'
import { KpiTile } from '@/components/kpis/KpiBits'

const inp: React.CSSProperties = { border: '1px solid #D0D5DD', borderRadius: 8, padding: '8px 10px', fontSize: 14, minWidth: 0 }
const btn: React.CSSProperties = { background: '#1B2F6E', color: '#fff', border: 0, borderRadius: 8, padding: '9px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }
const mon = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export default function KpiPage() {
  const [ks, setKs] = useState<Kpi[] | null>(null)
  const [month, setMonth] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<Kpi | null>(null)
  const [val, setVal] = useState(''); const [tgt, setTgt] = useState('')
  const [adding, setAdding] = useState(false)
  const [nn, setNn] = useState({ name: '', unit: 'number', target: '', direction: 'higher' })
  const load = useCallback(() => staffApi('/api/kpis').then((r: any) => { setKs(r.kpis); setMonth(r.month); setErr('') }).catch(e => { setErr(e.message); setKs([]) }), [])
  useEffect(() => { load() }, [load])
  const run = async (body: any) => { try { await staffApi('/api/kpis', body); await load() } catch (e: any) { setErr(e.message) } }
  const pick = (k: Kpi) => { setOpen(k); setVal(k.value == null ? '' : String(k.value)); setTgt(k.target == null ? '' : String(k.target)) }
  return (
    <div style={{ padding: '24px 30px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div><h1 style={{ fontSize: 22, margin: 0, color: '#16233F' }}>KPI Tracker</h1><div style={{ fontSize: 13, color: '#667085', marginTop: 4 }}>{month ? mon(month) : ''} against target. Click a tile to type in a number or change its target.</div></div>
        <button style={btn} onClick={() => setAdding(a => !a)}>{adding ? 'Cancel' : '+ Add a KPI'}</button>
      </div>
      {err && <div style={{ background: '#FDECEA', color: '#B42318', borderRadius: 8, padding: '8px 12px', margin: '12px 0', fontSize: 13 }}>{err}</div>}
      {adding && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0', background: '#F6F8FB', borderRadius: 12, padding: 12 }}>
          <input style={{ ...inp, flex: '2 1 180px' }} placeholder="Name, e.g. Viewings to offers" value={nn.name} onChange={e => setNn({ ...nn, name: e.target.value })} />
          <select style={inp} value={nn.unit} onChange={e => setNn({ ...nn, unit: e.target.value })}><option value="number">Number</option><option value="percent">Percent</option><option value="money">Money (£)</option><option value="days">Days</option></select>
          <input style={{ ...inp, width: 110 }} placeholder="Target" inputMode="decimal" value={nn.target} onChange={e => setNn({ ...nn, target: e.target.value })} />
          <select style={inp} value={nn.direction} onChange={e => setNn({ ...nn, direction: e.target.value })}><option value="higher">Higher is better</option><option value="lower">Lower is better</option></select>
          <button style={btn} onClick={async () => { await run({ action: 'add', ...nn }); setNn({ name: '', unit: 'number', target: '', direction: 'higher' }); setAdding(false) }}>Save</button>
        </div>
      )}
      {ks === null ? <div style={{ padding: 20, color: '#98A2B3' }}>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12, marginTop: 16 }}>
          {ks.map(k => <KpiTile key={k.id} k={k} onClick={() => pick(k)} />)}
        </div>
      )}
      {open && (
        <div style={{ marginTop: 18, border: '1px solid #E4E7EC', borderRadius: 12, padding: '16px 18px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ color: '#16233F' }}>{open.name}</b><button onClick={() => setOpen(null)} style={{ border: 0, background: 'none', cursor: 'pointer', color: '#667085', fontSize: 18 }} aria-label="Close">×</button></div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '10px 0', fontSize: 12.5, color: '#475467' }}>
            {open.history.map(h => <div key={h.period}><div style={{ color: '#98A2B3' }}>{mon(h.period)}</div><b>{fmt(h.value, open.unit as Unit)}</b></div>)}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ fontSize: 12, color: '#667085' }}>{mon(month)} value{open.auto ? ' (overrides the worked-out number)' : ''}<br /><input style={{ ...inp, width: 150, marginTop: 4 }} inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} /></label>
            <button style={btn} onClick={() => run({ action: 'set', kpi_id: open.id, period: month, value: val }).then(() => setOpen(null))}>Save value</button>
            <label style={{ fontSize: 12, color: '#667085' }}>Target<br /><input style={{ ...inp, width: 130, marginTop: 4 }} inputMode="decimal" value={tgt} onChange={e => setTgt(e.target.value)} /></label>
            <button style={{ ...btn, background: '#2F6DB5' }} onClick={() => run({ action: 'edit', id: open.id, target: tgt }).then(() => setOpen(null))}>Save target</button>
            <button style={{ ...btn, background: '#fff', color: '#B42318', border: '1px solid #F4C7C3', marginLeft: 'auto' }} onClick={() => run({ action: 'remove', id: open.id }).then(() => setOpen(null))}>Remove KPI</button>
          </div>
        </div>
      )}
    </div>
  )
}
