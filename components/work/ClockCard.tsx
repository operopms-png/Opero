'use client'
// Clock in / clock out for the signed-in person. Shown at the top of Work Hours and on the Dashboard.
// Signing in to the portal does not clock anyone in: they press Clock in to start their day.
import React, { useCallback, useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { localParts, toMinutes } from '@/lib/clock'

const dur = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m` }
const hm = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export default function ClockCard({ compact = false }: { compact?: boolean }) {
  const [me, setMe] = useState<any>(null), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [tick, setTick] = useState(Date.now())
  const load = useCallback(() => staffApi('/api/work-clock').then((d: any) => setMe(d.me)).catch(() => setMe(null)), [])
  useEffect(() => { load(); const a = setInterval(load, 60000), b = setInterval(() => setTick(Date.now()), 30000); return () => { clearInterval(a); clearInterval(b) } }, [load])
  if (!me || !me.eligible) return null
  const act = async (action: 'in' | 'out') => { setBusy(true); setErr(''); try { await staffApi('/api/work-clock', { action }); await load() } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const open = me.open, sh = me.shift
  const done = (me.today ?? []).filter((r: any) => !r.open)
  let flag: { text: string; tone: 'late' | 'ok' } | null = null
  if (open) flag = open.late_minutes > 0 ? { text: `Late by ${open.late_minutes} min`, tone: 'late' } : sh ? { text: 'On time', tone: 'ok' } : null
  else if (sh && !done.length) {
    const l = localParts(new Date(tick), sh.tz), over = l.minutes - toMinutes(sh.shift_start)
    if (sh.days.includes(l.dow) && over > sh.grace_minutes) flag = { text: `Shift started ${over} min ago`, tone: 'late' }
  }
  const secs = open ? Math.max(0, Math.round((tick - new Date(open.clock_in).getTime()) / 1000)) : 0
  const tone = flag?.tone === 'late' ? { background: '#FEF3F2', color: '#B42318' } : { background: '#ECFDF3', color: '#027A48' }
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: compact ? '14px 18px' : '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your clock</div>
        {open ? <>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0B1F3A', margin: '4px 0 2px' }}>{dur(secs)}</div>
          <div style={{ fontSize: 13, color: '#667085' }}>Clocked in at {hm(open.clock_in)}{sh ? ` · shift starts ${sh.shift_start}` : ''}</div>
        </> : <>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A', margin: '4px 0 2px' }}>{done.length ? `Clocked out · ${dur(done.reduce((s: number, r: any) => s + r.seconds, 0))} today` : 'Not clocked in'}</div>
          <div style={{ fontSize: 13, color: '#667085' }}>{sh ? `Shift starts ${sh.shift_start}` : 'No shift time set yet'}</div>
        </>}
        {flag && <span style={{ display: 'inline-block', marginTop: 8, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600, ...tone }}>{flag.text}</span>}
        {err && <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 6 }}>{err}</div>}
      </div>
      {open
        ? <button onClick={() => act('out')} disabled={busy} style={{ padding: '12px 22px', borderRadius: 10, border: '1px solid #FECDCA', background: '#fff', color: '#B42318', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Clock out'}</button>
        : <button onClick={() => act('in')} disabled={busy} style={{ padding: '12px 26px', borderRadius: 10, border: 'none', background: '#0B1F3A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Clock in'}</button>}
    </div>
  )
}
