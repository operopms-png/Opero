'use client'
// My day, Team and Notices: shown on the Staff Dashboard and on the Human Intelligence Hub overview.
// One copy, so both places always show the same thing.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'
import ClockCard from '@/components/work/ClockCard'
import DashboardWorkHours from '@/components/work/DashboardWorkHours'

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', line: '#dfe6f4' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'
const gbp = (n: number) => '£' + Math.round(n || 0).toLocaleString('en-GB')

export default function StaffDayTeamNotices({ headStyle }: { headStyle?: React.CSSProperties }) {
  const [d, setD] = useState<any>(null)
  const [notices, setNotices] = useState<any[]>([])
  const [lb, setLb] = useState<any[] | null>(null)
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const H = { Authorization: `Bearer ${session.access_token}` }
      fetch('/api/staff-dashboard?range=today', { headers: H }).then(r => r.ok ? r.json() : null).then(setD).catch(() => {})
      fetch('/api/announcements', { headers: H }).then(r => r.ok ? r.json() : null).then(j => setNotices(j?.unread ?? [])).catch(() => {})
    })()
    staffApi('/api/agent-leaderboard').then((x: any) => setLb(x.agents ?? [])).catch(() => setLb([]))
  }, [])
  async function gotIt(id: string) {
    setNotices(n => n.filter(x => x.id !== id))
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ action: 'read', id }) })
  }
  const sec: React.CSSProperties = headStyle ?? { margin: '26px 0 10px', fontSize: 16, fontWeight: 700, color: C.ink }
  const box: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px', boxShadow: shadow }
  return (
    <div>
      <h2 style={sec}>My day</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
        <div><ClockCard compact /></div>
        <div style={box}>
          <b style={{ color: C.ink, fontSize: 14 }}>Today</b>
          {!d ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div> : (d.schedule ?? []).length === 0 ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Nothing booked today.</div>
            : d.schedule.slice(0, 6).map((e: any, i: number) => <Link key={i} href={e.href ?? '/staff-centre/calendar'} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i ? `1px solid ${C.line}` : 'none', fontSize: 13, color: C.text, textDecoration: 'none' }}>
              <span style={{ width: 44, color: C.muted }}>{e.time ?? ''}</span><span style={{ flex: 1 }}>{e.title}</span></Link>)}
          <Link href="/staff-centre/tasks" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#2f5bd6', textDecoration: 'none' }}>{d?.hero?.tasks?.n ?? 0} tasks due · Open Tasks →</Link>
        </div>
      </div>

      <h2 style={sec}>Team</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
        <div><DashboardWorkHours /></div>
        <div style={box}>
          <b style={{ color: C.ink, fontSize: 14 }}>Agent leaderboard</b>
          {lb === null ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div> : lb.length === 0 ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No active agents yet.</div>
            : lb.slice(0, 5).map((x: any, i: number) => <div key={x.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i ? `1px solid ${C.line}` : 'none', fontSize: 13 }}><b style={{ width: 20, color: C.muted }}>{i + 1}</b><span style={{ flex: 1 }}>{x.name}</span><b style={{ color: C.ink }}>{gbp(x.total)}</b></div>)}
          <Link href="/staff-centre/performance" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#2f5bd6', textDecoration: 'none' }}>Staff Performance →</Link>
        </div>
      </div>

      <h2 style={sec}>Notices</h2>
      <div style={box}>
        {notices.length === 0 ? <span style={{ fontSize: 13, color: C.muted }}>No unread announcements.</span> : notices.slice(0, 3).map((n: any, i: number) => <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}>
          <span style={{ flex: 1, fontSize: 13.5, color: C.ink }}>{n.title ?? n.body}</span>
          <button onClick={() => gotIt(n.id)} style={{ fontSize: 12, color: '#2f5bd6', background: '#fff', border: '1px solid #2f5bd6', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Got it</button></div>)}
        <Link href="/staff-centre/training" style={{ display: 'inline-block', marginTop: 8, fontSize: 12.5, fontWeight: 600, color: '#2f5bd6', textDecoration: 'none' }}>What is new in Staff Training →</Link>
      </div>
    </div>
  )
}
