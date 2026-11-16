'use client'
// Work Hours → clock-ins, late arrivals and shift times. Shown to the account owner and the staff they choose.
// Only the owner can change shift times. "Preview example" shows labelled sample figures, not real data.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const hm = (d: string | null) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const dur = (s: number) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m` }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const box: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 18 }
const field: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', background: '#fff' }
const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 12.5, color: '#667085', fontWeight: 600, borderBottom: '1px solid #EAECF0', background: '#FAFAFB' }
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 13.5, borderBottom: '1px solid #EAECF0' }
const pill = (late: boolean, text: string) => <span style={{ borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600, background: late ? '#FEF3F2' : '#ECFDF3', color: late ? '#B42318' : '#027A48', whiteSpace: 'nowrap' }}>{text}</span>

const t0 = Date.now(), ago = (d: number, h: number, m: number) => { const x = new Date(t0 - d * 864e5); x.setHours(h, m, 0, 0); return x.toISOString() }
const EXAMPLE = {
  rows: [
    { id: 'a', email: 'x1', name: 'Example Receptionist', clock_in: ago(0, 9, 12), clock_out: null, shift_start: '09:00', late_minutes: 12, open: true, seconds: 16680 },
    { id: 'b', email: 'x1', name: 'Example Receptionist', clock_in: ago(3, 8, 56), clock_out: ago(3, 17, 4), shift_start: '09:00', late_minutes: 0, open: false, seconds: 29280 },
    { id: 'c', email: 'x1', name: 'Example Receptionist', clock_in: ago(4, 9, 7), clock_out: ago(4, 17, 1), shift_start: '09:00', late_minutes: 7, open: false, seconds: 28440 },
    { id: 'd', email: 'x1', name: 'Example Receptionist', clock_in: ago(5, 8, 58), clock_out: ago(5, 17, 10), shift_start: '09:00', late_minutes: 0, open: false, seconds: 29520 },
  ], shifts: [] as any[], missing: [{ email: 'x2', name: 'Example Agent', shift_start: '09:30', minutes: 40 }],
}

export default function ClockReport() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 6 * 864e5))), [to, setTo] = useState(iso(new Date()))
  const [d, setD] = useState<any>(null), [team, setTeam] = useState<{ name: string; email: string }[]>([]), [sample, setSample] = useState(false), [edit, setEdit] = useState(false)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => staffApi(`/api/work-clock?from=${from}&to=${to}`).then(setD).catch(() => setD(null)), [from, to])
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])
  useEffect(() => { staffApi('/api/work-sessions/viewers').then((x: any) => setTeam(x.team ?? [])).catch(() => {}) }, [])
  const data = sample ? EXAMPLE : d
  const owner = !!d?.canView && team.length >= 0
  const rows: any[] = data?.rows ?? [], missing: any[] = data?.missing ?? []
  const stat = useMemo(() => ({ late: rows.filter(r => r.late_minutes > 0).length, secs: rows.reduce((s, r) => s + r.seconds, 0) }), [rows])
  if (!d?.canView) return null

  const csv = () => {
    const L = [['Person', 'Email', 'Date', 'Shift', 'Clocked in', 'Clocked out', 'Hours', 'Late minutes'].join(',')]
    for (const r of rows) L.push([r.name || '', r.email, new Date(r.clock_in).toLocaleDateString('en-GB'), r.shift_start || '', hm(r.clock_in), r.open ? 'Still in' : r.clock_out ? hm(r.clock_out) : 'Not clocked out', dur(r.seconds), r.late_minutes].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/csv' })); a.download = `clock-ins-${from}-to-${to}.csv`; a.click()
  }
  const shiftFor = (email: string) => (d.shifts ?? []).find((s: any) => s.email === email)
  const save = async (t: { name: string; email: string }, v: any) => { setMsg(''); try { await staffApi('/api/work-clock', { action: 'shift', email: t.email, name: t.name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ...v }); setMsg('Saved.'); load() } catch (e: any) { setMsg(e.message) } }

  return (
    <div style={{ ...box, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1F3A', marginRight: 'auto' }}>Clock-ins and late arrivals</div>
        <label style={{ fontSize: 13, color: '#667085' }}>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={field} /></label>
        <label style={{ fontSize: 13, color: '#667085' }}>To <input type="date" value={to} onChange={e => setTo(e.target.value)} style={field} /></label>
        <button onClick={() => setSample(s => !s)} style={{ ...field, cursor: 'pointer' }}>{sample ? 'Back to my data' : 'Preview example'}</button>
        <button onClick={csv} disabled={!rows.length} style={{ ...field, cursor: 'pointer' }}>Download (CSV)</button>
      </div>
      {sample && <div style={{ background: '#FFF7E6', border: '1px solid #F5D9A8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#7A4B00', marginBottom: 12 }}>Example data only. These are not your staff.</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {[[String(stat.late), 'Late arrivals'], [String(missing.length), 'Not clocked in today'], [dur(stat.secs), 'Hours clocked']].map(([a, b]) =>
          <div key={b} style={{ border: '1px solid #EAECF0', borderRadius: 8, padding: '10px 14px', minWidth: 140 }}><div style={{ fontSize: 20, fontWeight: 700, color: '#0B1F3A' }}>{a}</div><div style={{ fontSize: 12, color: '#667085' }}>{b}</div></div>)}
      </div>
      {missing.length > 0 && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#B42318', marginBottom: 12 }}>
        Not clocked in yet: {missing.map(m => `${m.name} (shift ${m.shift_start}, ${m.minutes} min ago)`).join(' · ')}</div>}
      {!rows.length ? <div style={{ color: '#667085', fontSize: 13, padding: '8px 0' }}>No clock-ins for these dates yet. Staff press Clock in to start their day.</div> :
        <div style={{ overflowX: 'auto', border: '1px solid #EAECF0', borderRadius: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr>{['Person', 'Date', 'Shift', 'Clocked in', 'Clocked out', 'Hours', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}>
            <td style={td}><b style={{ fontWeight: 600 }}>{r.name || r.email}</b></td><td style={td}>{day(r.clock_in)}</td><td style={td}>{r.shift_start || '—'}</td><td style={td}>{hm(r.clock_in)}</td>
            <td style={td}>{r.open ? <span style={{ color: '#037F4C', fontWeight: 600 }}>Still in</span> : r.clock_out ? hm(r.clock_out) : <span style={{ color: '#B54708' }}>Not clocked out</span>}</td>
            <td style={td}>{dur(r.seconds)}</td><td style={td}>{!r.shift_start ? <span style={{ color: '#98A2B3' }}>No shift set</span> : r.late_minutes > 0 ? pill(true, `Late ${r.late_minutes} min`) : pill(false, 'On time')}</td></tr>)}</tbody>
        </table></div>}
      {!sample && d.me?.eligible !== undefined && team.length > 0 && <div style={{ marginTop: 14 }}>
        <button onClick={() => setEdit(v => !v)} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2F6DB5' }}>{edit ? 'Hide shift times' : 'Set shift times'}</button>
        {edit && <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: '#667085' }}>Choose each person's start time, the grace period before they count as late, and their working days. Times use the time zone of the computer you save from.</div>
          {team.map(t => <ShiftRow key={t.email} t={t} s={shiftFor(t.email.toLowerCase())} onSave={v => save({ ...t, email: t.email.toLowerCase() }, v)} onRemove={() => save({ ...t, email: t.email.toLowerCase() }, { remove: true })} />)}
          {msg && <div style={{ fontSize: 13, color: msg === 'Saved.' ? '#027A48' : '#B42318' }}>{msg}</div>}
        </div>}
      </div>}
    </div>
  )
}

function ShiftRow({ t, s, onSave, onRemove }: { t: { name: string; email: string }; s: any; onSave: (v: any) => void; onRemove: () => void }) {
  const [start, setStart] = useState(s?.shift_start ?? '09:00'), [grace, setGrace] = useState<number>(s?.grace_minutes ?? 5), [days, setDays] = useState<number[]>(s?.days ?? [1, 2, 3, 4, 5])
  useEffect(() => { if (s) { setStart(s.shift_start); setGrace(s.grace_minutes); setDays(s.days) } }, [s])
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', border: '1px solid #EAECF0', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ minWidth: 150, fontSize: 13.5, fontWeight: 600 }}>{t.name || t.email}{!s && <div style={{ fontSize: 11.5, color: '#98A2B3', fontWeight: 400 }}>No shift set</div>}</div>
      <input type="time" value={start} onChange={e => setStart(e.target.value)} style={field} />
      <label style={{ fontSize: 12.5, color: '#667085' }}>Grace <input type="number" min={0} max={60} value={grace} onChange={e => setGrace(Number(e.target.value))} style={{ ...field, width: 60 }} /> min</label>
      <div style={{ display: 'flex', gap: 4 }}>{DAYS.map((n, i) => <button key={n} onClick={() => setDays(d => d.includes(i + 1) ? d.filter(x => x !== i + 1) : [...d, i + 1])} style={{ padding: '5px 7px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (days.includes(i + 1) ? '#2F6DB5' : '#D0D5DD'), background: days.includes(i + 1) ? '#EAF2FB' : '#fff', color: days.includes(i + 1) ? '#2F6DB5' : '#667085' }}>{n}</button>)}</div>
      <button onClick={() => onSave({ shift_start: start, grace_minutes: grace, days })} style={{ ...field, cursor: 'pointer', background: '#0B1F3A', color: '#fff', border: 'none', fontWeight: 600 }}>Save</button>
      {s && <button onClick={onRemove} style={{ ...field, cursor: 'pointer' }}>Remove</button>}
    </div>
  )
}
