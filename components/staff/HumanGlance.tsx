'use client'
// At a glance for the Human Intelligence Hub: what needs a person today, in the hub's four groups.
// Read only. Every figure is one of the live counts behind the menu badges (sidebar_counts), so the
// tiles and the red badges always match, and each tile opens the page it comes from.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Tone = 'good' | 'warn' | 'plain'
type Tile = { key: string; label: string; none: string; note: string; tone: Tone; href: string }

const GROUPS: { title: string; tiles: Tile[] }[] = [
  { title: 'Clients and sales', tiles: [
    { key: 'inbox', label: 'Unread messages', note: 'Texts and team chats', none: 'Nothing unread', tone: 'warn', href: '/staff-centre/inbox' },
    { key: 'webchat', label: 'Website chats', note: 'Not yet read', none: 'All read', tone: 'warn', href: '/staff-centre/website-chats' },
    { key: 'crm', label: 'CRM follow-ups due', note: 'Due today or earlier', none: 'None due', tone: 'warn', href: '/staff-centre/crm' },
    { key: 'listings', label: 'Viewing requests', note: 'Waiting to be confirmed', none: 'None waiting', tone: 'warn', href: '/staff-centre/listings' },
  ] },
  { title: 'Money', tiles: [
    { key: 'approvals', label: 'Approvals waiting', note: 'Need your decision', none: 'Nothing waiting', tone: 'warn', href: '/staff-centre/approvals' },
    { key: 'arrears', label: 'Overdue rent payments', note: 'Not yet paid', none: 'None overdue', tone: 'warn', href: '/staff-centre/finance/arrears' },
    { key: 'partners', label: 'Partner payments to confirm', note: 'Bank transfers marked as sent', none: 'Nothing to confirm', tone: 'warn', href: '/staff-centre/partners' },
  ] },
  { title: 'Operations', tiles: [
    { key: 'maintenance', label: 'Open repairs', note: 'Not yet completed', none: 'None open', tone: 'plain', href: '/staff-centre/upkeep?view=repairs' },
    { key: 'compliance', label: 'Certificates expiring', note: 'Within 30 days', none: 'None expiring', tone: 'warn', href: '/staff-centre/compliance' },
    { key: 'meetings', label: 'Meetings', note: 'Today, or requested', none: 'None today', tone: 'plain', href: '/staff-centre/meetings' },
    { key: 'tasks', label: 'Tasks due', note: 'Due today or earlier', none: 'None due', tone: 'warn', href: '/staff-centre/tasks' },
  ] },
  { title: 'Company', tiles: [
    { key: 'applications', label: 'Applications to review', note: 'New or applied', none: 'None to review', tone: 'warn', href: '/staff-centre/applications' },
    { key: 'hr', label: 'Staff requests', note: 'Waiting for a decision', none: 'None pending', tone: 'warn', href: '/staff-centre/hr' },
    { key: 'announcements', label: 'Unread announcements', note: 'Pinned and not yet read', none: 'All read', tone: 'warn', href: '/staff-centre/announcements' },
  ] },
]

const C = { ink: '#10234d', muted: '#6b7a9f', line: '#e4e9f4', blue: '#2F6DB5' }
const TONE: Record<Tone, string> = { good: '#067647', warn: '#B54708', plain: '#667085' }

export default function HumanGlance({ canOpen }: { canOpen: (href: string) => boolean }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [d, setD] = useState<any>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/staff-dashboard?range=today', { headers: { Authorization: `Bearer ${session.access_token}` } }).then(r => r.ok ? r.json() : null).then(setD).catch(() => {})
    })
  }, [])
  useEffect(() => {
    supabase.rpc('sidebar_counts').then(({ data }) => setCounts((data as Record<string, number>) ?? {}), () => setCounts({}))
  }, [])
  if (!counts) return null
  const groups = GROUPS.map(g => ({ ...g, tiles: g.tiles.filter(t => canOpen(t.href)) })).filter(g => g.tiles.length)
  if (!groups.length) return null
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ margin: 0, fontSize: 21, color: C.ink }}>At a glance</h2>
      <p style={{ margin: '3px 0 4px', fontSize: 14, color: C.muted }}>What needs you today. Open any tile for the detail.</p>
      {d && canOpen('/pm') && (() => {
        const pm = (d.modules ?? []).find((m: any) => m.key === 'pm'), ea = (d.modules ?? []).find((m: any) => m.key === 'ea')
        const jobs = (d.modules ?? []).reduce((a: number, m: any) => a + (Number((m.stats ?? []).find((x: any) => x.l === 'Open jobs')?.v) || 0), 0)
        const certs = (d.attention ?? []).filter((a: any) => /certificate/i.test(a.title)).length
        const tiles: [string, string | number, string][] = [['Rent paid', pm?.stats?.find((x: any) => x.l === 'Rent paid')?.v ?? '—', '/pm'], ['Property Management let', pm ? `${pm.occ}%` : '—', '/pm'], ['Estate Agency let', ea ? `${ea.occ}%` : '—', '/estate'], ['Open jobs', jobs, '/staff-centre/upkeep?view=repairs'], ['Certificates to renew', certs, '/staff-centre/compliance']]
        return (
          <div>
            <h3 style={{ margin: '18px 0 8px', fontSize: 15, color: '#1D4E89' }}>Business pulse</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
              {tiles.map(([l, v, h]) => <Link key={l} href={h} style={{ textDecoration: 'none', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'block' }}>
                <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.blue, margin: '3px 0 1px' }}>{v}</div></Link>)}
            </div>
          </div>)
      })()}
      {groups.map(g => (
        <div key={g.title}>
          <h3 style={{ margin: '18px 0 8px', fontSize: 15, color: '#1D4E89' }}>{g.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {g.tiles.map(t => {
              const n = Number(counts[t.key] ?? 0)
              return (
                <Link key={t.key} href={t.href} style={{ textDecoration: 'none', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'block' }}>
                  <div style={{ fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.blue, margin: '3px 0 1px' }}>{n}</div>
                  <div style={{ fontSize: 12, color: n ? TONE[t.tone] : TONE.good }}>{n ? t.note : t.none}</div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
