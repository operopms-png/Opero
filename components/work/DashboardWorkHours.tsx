'use client'
// Dashboard card: today's sign-ins, sign-outs and time on the portal. Shown to the account owner, and to
// staff the owner picks under "Who can see this". Anyone else sees nothing.
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { staffApi } from '@/lib/staff-api'

const hm = (d: string | null) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
const dur = (s: number) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m` }
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default function DashboardWorkHours() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [cfg, setCfg] = useState<{ viewers: string[]; team: { name: string; email: string }[] } | null>(null)
  const [showCfg, setShowCfg] = useState(false)
  const load = () => staffApi(`/api/work-sessions?from=${iso(new Date(Date.now() - 6 * 864e5))}&to=${iso(new Date())}`).then((d: any) => setRows(d.sessions ?? [])).catch(() => setDenied(true))
  useEffect(() => { load(); staffApi('/api/work-sessions/viewers').then((d: any) => setCfg(d)).catch(() => {}); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])
  if (denied) return null
  const today = iso(new Date())
  const todays = (rows ?? []).filter(r => iso(new Date(r.started_at)) === today).slice().reverse()
  const week: Record<string, { name: string; secs: number }> = {}
  for (const r of rows ?? []) { const w = (week[r.email] ??= { name: r.name || r.email, secs: 0 }); w.secs += r.seconds }
  const toggle = async (email: string) => {
    if (!cfg) return
    const v = cfg.viewers.includes(email) ? cfg.viewers.filter(x => x !== email) : [...cfg.viewers, email]
    setCfg({ ...cfg, viewers: v })
    await staffApi('/api/work-sessions/viewers', { viewers: v }).catch(() => {})
  }
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11.5, color: '#667085', fontWeight: 600, padding: '6px 6px', borderBottom: '1px solid #EEF0F5' }
  const td: React.CSSProperties = { fontSize: 13, padding: '8px 6px', borderBottom: '1px solid #F2F4F7' }
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '18px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 14.5, fontWeight: 700, color: '#16233F' }}>Work hours today</div><div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Sign-in, sign-out and time on the portal</div></div>
        <div style={{ display: 'flex', gap: 12 }}>
          {cfg && <button onClick={() => setShowCfg(v => !v)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#2F6DB5' }}>Who can see this</button>}
          <Link href="/staff-centre/work-hours" style={{ fontSize: 12.5, fontWeight: 600, color: '#2F6DB5', textDecoration: 'none' }}>Full report →</Link>
        </div>
      </div>
      {showCfg && cfg && <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, padding: 12, margin: '12px 0', background: '#FAFAFB' }}>
        <div style={{ fontSize: 12.5, color: '#475467', marginBottom: 8 }}>Only you see this by default. Tick anyone you want to see it too.</div>
        {cfg.team.length === 0 ? <div style={{ fontSize: 12.5, color: '#98A2B3' }}>No team members yet.</div> : cfg.team.map(t => (
          <label key={t.email} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '3px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={cfg.viewers.includes(t.email.toLowerCase())} onChange={() => toggle(t.email.toLowerCase())} />{t.name || t.email}
          </label>))}
      </div>}
      {rows === null ? <div style={{ padding: 14, color: '#98A2B3', fontSize: 13 }}>Loading…</div>
        : todays.length === 0 ? <div style={{ padding: 14, color: '#667085', fontSize: 13 }}>No one has signed in today yet.</div>
        : <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead><tr><th style={th}>Person</th><th style={th}>In</th><th style={th}>Out</th><th style={th}>Time</th></tr></thead>
          <tbody>{todays.map(r => <tr key={r.id}>
            <td style={td}>{r.name || r.email}</td><td style={td}>{hm(r.started_at)}</td>
            <td style={td}>{r.live ? <span style={{ color: '#037F4C', fontWeight: 600 }}>Now</span> : hm(r.signed_out)}</td><td style={td}>{dur(r.seconds)}</td></tr>)}</tbody>
        </table>}
      {Object.keys(week).length > 0 && <div style={{ marginTop: 12, fontSize: 12.5, color: '#475467' }}><b style={{ color: '#16233F' }}>Last 7 days:</b> {Object.values(week).sort((a, b) => b.secs - a.secs).map(w => `${w.name} ${dur(w.secs)}`).join(' · ')}</div>}
    </div>
  )
}
