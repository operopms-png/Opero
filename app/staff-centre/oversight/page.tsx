'use client'
// Staff Centre → Dashboard ("Operations"): what's happening today (or this
// week / month) across Vacation Rentals, Property Management and Estate Agency.
// Sangsters cream-and-gold band with the day's key numbers, a card per
// business, the schedule, what needs attention and the latest activity.
// Data: GET /api/staff-dashboard?range=today|week|month (Jamaica time).
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const C = { ink: '#191815', brown: '#5A4320', gold: '#A8862E', goldT: '#8E6B1F', gold2: '#D9B866', cream: '#FBF4E6', line: '#E7E4DC', muted: '#8A877F', text: '#3b3833', bg: '#F7F6F2' }
const MOD: Record<string, string> = { vr: '#B08A2E', pm: '#2F6DB5', ea: '#138a62', dev: '#7A4FB0', staff: '#8A877F' } // validated categorical set
const TONE = { red: { c: '#B42318', bg: '#FDECEC' }, amber: { c: '#9A6400', bg: '#FFF4DE' }, blue: { c: '#1F5BB0', bg: '#E8F0FB' } }
const P: Record<string, string> = {
  in: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  viewing: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6', check: 'M5 12l5 5 9-10', task: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  msg: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z', meeting: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6', wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z',
  key: 'M15 7a4 4 0 1 1-3.5 6L5 19.5V22H2v-3l6.5-6.5A4 4 0 0 1 15 7z', file: 'M14 3H6v18h12V7zM14 3v4h4', home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pound: 'M17 20H7c2-2 2-5 1.5-8H15M6 12h7M16.5 6.5A4 4 0 0 0 9 8c0 1.5.5 3 .5 4', arrow: 'M5 12h14M13 6l6 6-6 6', refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
}
const Ico = ({ k, s = 16, c = 'currentColor' }: { k: string; s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}><path d={P[k] || P.check} /></svg>
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 10 }
const RANGES = [['today', 'Today'], ['week', 'This week'], ['month', 'This month']] as const

function ago(iso: string) {
  const m = (Date.now() - new Date(iso).getTime()) / 6e4
  if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`
  const d = Math.round(m / 1440); return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const dayLabel = (ymd: string, today: string) => ymd === today ? 'Today' : new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Dashboard() {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today')
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [clock, setClock] = useState(new Date())
  const [notices, setNotices] = useState<any[]>([])
  async function loadNotices() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      const j = await res.json(); if (res.ok) setNotices(j.unread || [])
    } catch {}
  }
  async function markRead(id: string) {
    setNotices(n => n.filter(x => x.id !== id))
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ action: 'read', id }) })
  }
  useEffect(() => { loadNotices() }, [])

  async function load(r = range) {
    setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/staff-dashboard?range=' + r, { headers: { Authorization: `Bearer ${session.access_token}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not load the dashboard')
      setD(j)
    } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { load(range) }, [range]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 30000); const r = setInterval(() => load(), 5 * 60000); return () => { clearInterval(t); clearInterval(r) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const t = (tz: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(clock)
  const title = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Jamaica', weekday: 'long', day: 'numeric', month: 'long' }).format(clock)
  const rangeName = range === 'today' ? 'today' : range === 'week' ? 'this week' : 'this month'
  const hero = d ? [
    { k: 'in', l: 'Check-ins', ...d.hero.checkIns, href: '/str' },
    { k: 'out', l: 'Check-outs', ...d.hero.checkOuts, href: '/str' },
    { k: 'viewing', l: 'Viewings', ...d.hero.viewings, href: '/staff-centre/listings' },
    { k: 'task', l: 'Tasks due', ...d.hero.tasks, href: '/staff-centre/tasks' },
    { k: 'msg', l: 'New messages', ...d.hero.messages, href: '/staff-centre/inbox' },
  ] : []

  return (
    <div style={{ minHeight: 'calc(100vh - var(--hub-h, 0px))', background: C.bg, fontFamily: 'Figtree, Inter, -apple-system, sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');
        .dash-grid3{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .dash-cols{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:16px}
        .dash-hero{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
        @media(max-width:1300px){.dash-grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:1100px){.dash-cols{grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.dash-grid3{grid-template-columns:1fr}}
        @media(max-width:760px){.dash-cols{grid-template-columns:1fr}.dash-hero{grid-template-columns:repeat(2,minmax(0,1fr))}}
        .dash-link:hover{background:#FFFCF5}`}</style>

      {/* Band — Sangsters cream & gold */}
      <div style={{ background: 'linear-gradient(135deg,#FBF4E6 0%,#F3E6C8 100%)', borderBottom: '1px solid #EADBB8', padding: '24px 30px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -90, width: 300, height: 300, borderRadius: 300, border: '1px solid rgba(168,134,46,.22)' }} />
        <div style={{ position: 'absolute', right: 40, top: -150, width: 300, height: 300, borderRadius: 300, border: '1px solid rgba(168,134,46,.14)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', color: C.goldT }}>OPERATIONS · {rangeName.toUpperCase()}</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: C.brown, letterSpacing: '-.01em' }}>{title}</h1>
            <div style={{ fontSize: 13, color: '#8A7248', marginTop: 3 }}>Jamaica {t('America/Jamaica')} · London {t('Europe/London')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #D9C69A', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              {RANGES.map(([k, l], i) => <button key={k} onClick={() => setRange(k)} style={{ padding: '8px 14px', border: 'none', borderLeft: i ? '1px solid #EADBB8' : 'none', background: range === k ? C.gold : '#fff', color: range === k ? '#fff' : C.brown, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>)}
            </div>
            <button onClick={() => load()} title="Refresh" aria-label="Refresh" style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D9C69A', background: '#fff', color: C.goldT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Ico k="refresh" s={15} /></button>
          </div>
        </div>
        <div className="dash-hero" style={{ marginTop: 20, position: 'relative' }}>
          {(d ? hero : Array.from({ length: 5 })).map((h: any, i) => h ? (
            <Link key={h.k} href={h.href} className="dash-link" style={{ background: '#fff', border: '1px solid #EADBB8', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', color: C.text, boxShadow: '0 1px 0 rgba(90,67,32,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.goldT, fontWeight: 600 }}><Ico k={h.k} s={14} />{h.l}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: '-.02em' }}>{h.n}</div>
              <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 15 }}>{h.sub || (h.n ? '' : 'None ' + rangeName)}</div>
            </Link>
          ) : <div key={i} style={{ background: 'rgba(255,255,255,.6)', border: '1px solid #EADBB8', borderRadius: 10, height: 96 }} />)}
        </div>
      </div>

      <div style={{ padding: '22px 30px 40px' }}>
        {notices[0] && (
          <div style={{ ...card, borderLeft: `4px solid ${C.gold}`, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, background: '#FFFCF5' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: '#F6EBD0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico k="msg" s={15} c={C.goldT} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{notices[0].title}</div>
              {notices[0].body && <div style={{ fontSize: 12.5, color: C.text, marginTop: 2, whiteSpace: 'pre-wrap' }}>{notices[0].body}</div>}
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{notices[0].author} · {ago(notices[0].created_at)}{notices.length > 1 && <> · <Link href="/staff-centre/announcements" style={{ color: C.goldT, fontWeight: 600 }}>{notices.length - 1} more</Link></>}</div>
            </div>
            <button onClick={() => markRead(notices[0].id)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #D9D4C7', background: '#fff', fontSize: 12, fontWeight: 600, color: C.text, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Got it</button>
          </div>
        )}
        {err && <div style={{ ...card, padding: 14, color: '#B42318', marginBottom: 16 }}>{err} <button onClick={() => load()} style={{ marginLeft: 8, border: 'none', background: 'none', color: C.goldT, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button></div>}

        {/* Business cards */}
        <div className="dash-grid3">
          {(d?.modules || [{}, {}, {}, {}]).map((m: any, i: number) => <ModuleCard key={m.key || i} m={m} />)}
        </div>

        <div className="dash-cols" style={{ marginTop: 16 }}>
          {/* Schedule */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{range === 'today' ? 'Today’s schedule' : range === 'week' ? 'This week’s schedule' : 'This month’s schedule'}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Jamaica time</div></div>
              <Link href="/staff-centre/calendar" style={{ fontSize: 12.5, color: C.goldT, fontWeight: 600, textDecoration: 'none' }}>Open Schedule →</Link>
            </div>
            {!d ? <Skel n={4} /> : d.schedule.length === 0 ? <Empty text={`Nothing booked ${rangeName}.`} /> : d.schedule.map((e: any, i: number) => {
              const showDay = range !== 'today' && (i === 0 || d.schedule[i - 1].date !== e.date)
              return (
                <React.Fragment key={i}>
                  {showDay && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.goldT, marginTop: 14 }}>{dayLabel(e.date, d.today)}</div>}
                  <Link href={e.href} className="dash-link" style={{ display: 'flex', gap: 12, padding: '10px 4px', borderBottom: '1px solid #F2F0EA', textDecoration: 'none', color: C.text, borderRadius: 4 }}>
                    <div style={{ width: 44, fontSize: 12.5, fontWeight: 700, color: C.ink, paddingTop: 1 }}>{e.time || (e.kind === 'in' ? 'In' : e.kind === 'out' ? 'Out' : 'Due')}</div>
                    <span style={{ width: 3, borderRadius: 3, background: MOD[e.module] || C.muted, flexShrink: 0 }} />
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#F6F3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico k={e.kind} s={15} c="#5C5850" /></span>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div><div style={{ fontSize: 11.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.sub}</div></div>
                  </Link>
                </React.Fragment>
              )
            })}
          </div>

          {/* Needs attention */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Needs attention</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Most urgent first</div>
            {!d ? <Skel n={4} /> : d.attention.length === 0 ? <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 8, background: '#E6F7EF', color: '#0E7C55', fontSize: 13, fontWeight: 600 }}><Ico k="check" />Nothing waiting — all clear.</div>
              : d.attention.map((a: any, i: number) => { const tn = (TONE as any)[a.tone]; return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F2F0EA' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: tn.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico k={a.icon} s={16} c={tn.c} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div><div style={{ fontSize: 11.5, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div></div>
                  <Link href={a.href} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid #D9D4C7', fontSize: 12, fontWeight: 600, color: C.text, textDecoration: 'none', whiteSpace: 'nowrap' }}>{a.action}</Link>
                </div>) })}
          </div>

          {/* Activity */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Latest activity</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Across the portal</div>
            {!d ? <Skel n={5} /> : d.activity.length === 0 ? <Empty text="No activity yet." /> : d.activity.map((a: any, i: number) => (
              <Link key={i} href={a.href} className="dash-link" style={{ display: 'flex', gap: 10, padding: '9px 4px', borderBottom: '1px solid #F2F0EA', textDecoration: 'none', color: C.text, borderRadius: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: 7, background: MOD[a.module] || C.gold, marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13 }}>{a.text}</div><div style={{ fontSize: 11.5, color: C.muted }}>{a.where} · {ago(a.at)}</div></div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ m }: { m: any }) {
  if (!m.key) return <div style={{ ...card, height: 150 }} />
  const col = MOD[m.key], r = 25, Cc = 2 * Math.PI * r
  return (
    <Link href={m.href} className="dash-link" style={{ ...card, borderTop: `3px solid ${col}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, textDecoration: 'none', color: C.text, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="62" height="62" viewBox="0 0 62 62" role="img" aria-label={`${m.occ}% ${m.ringLabel || (m.key === 'vr' ? 'booked this month' : 'let')}`} style={{ flexShrink: 0 }}>
          <circle cx="31" cy="31" r={r} fill="none" stroke="#EFECE4" strokeWidth="7" />
          <circle cx="31" cy="31" r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(Cc * m.occ) / 100} ${Cc}`} transform="rotate(-90 31 31)" />
          <text x="31" y="35.5" textAnchor="middle" fontSize="13.5" fontWeight="800" fill={C.ink}>{m.occ}%</text>
        </svg>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}><div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div><Ico k="arrow" s={14} c={C.muted} /></div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.note}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{m.ringLabel || (m.key === 'vr' ? 'booked this month' : 'let')}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid #F2F0EA', fontSize: 11.5 }}>
        {m.stats.map((s: any) => <div key={s.l} style={{ minWidth: 0 }}><div style={{ color: C.muted, whiteSpace: 'nowrap' }}>{s.l}</div><b style={{ fontSize: 13.5, color: C.ink, whiteSpace: 'nowrap' }}>{s.v}</b></div>)}
      </div>
    </Link>
  )
}
const Skel = ({ n }: { n: number }) => <div style={{ marginTop: 10 }}>{Array.from({ length: n }).map((_, i) => <div key={i} style={{ height: 40, borderRadius: 6, background: '#F4F2EC', marginTop: 8 }} />)}</div>
const Empty = ({ text }: { text: string }) => <div style={{ fontSize: 13, color: C.muted, padding: '18px 0' }}>{text}</div>
