'use client'
// Staff Centre → Human Intelligence Hub → Overview → Staff Dashboard.
// One landing page for the team: every staff page as a tile (with its red count), and a Shared tools row that
// opens the real company-wide pages. The same staff pages also run along the top of each of them (HubTabs).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StaffDayTeamNotices from '@/components/staff/StaffDayTeamNotices'
import { useRole, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { STAFF_HUBS, type HubTab } from '@/lib/staffHubs'

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', line: '#dfe6f4' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'
const WHAT: Record<string, string> = {
  '/settings?section=Team+Management': 'Add team members and set what each person can open.',
  '/staff-centre/announcements': 'Notices for the whole team, with pinned ones everyone must acknowledge.',
  '/staff-centre/activity-log': 'Who changed what, and when.',
  '/staff-centre/work-hours': 'Hours worked by each team member.',
  '/staff-centre/hr': 'Staff records, leave and HR cases.',
  '/staff-centre/hr-documents': 'Contracts, policies and HR paperwork.',
  '/staff-centre/performance': 'How each person is doing against their targets.',
  '/staff-centre/training': 'Guides and what is new, so everyone stays up to date.',
  '/staff-centre/applications': 'People who have applied to join the team.',
}
const SHARED = ['/staff-centre/tasks', '/staff-centre/calendar', '/staff-centre/approvals', '/staff-centre/meetings', '/staff-centre/inbox', '/staff-centre/email']
// Red-number tiles: the counts the menu already uses, each opening its page
const ATTN: { badge: string; label: string; href: string }[] = [
  { badge: 'approvals', label: 'Approvals', href: '/staff-centre/approvals' }, { badge: 'arrears', label: 'Arrears', href: '/staff-centre/finance/arrears' },
  { badge: 'compliance', label: 'Compliance', href: '/staff-centre/compliance' }, { badge: 'maintenance', label: 'Maintenance', href: '/staff-centre/upkeep' },
  { badge: 'inbox', label: 'Conversations', href: '/staff-centre/inbox' }, { badge: 'webchat', label: 'Website chats', href: '/staff-centre/website-chats' },
  { badge: 'crm', label: 'CRM leads', href: '/staff-centre/crm' }, { badge: 'applications', label: 'Applications', href: '/staff-centre/applications' },
  { badge: 'tasks', label: 'Tasks', href: '/staff-centre/tasks' }, { badge: 'meetings', label: 'Meetings', href: '/staff-centre/meetings' },
  { badge: 'hr', label: 'HR', href: '/staff-centre/hr' }, { badge: 'announcements', label: 'Announcements', href: '/staff-centre/announcements' },
]
const TONE: Record<string, string> = { red: '#EF4444', amber: '#F59E0B', blue: '#2F6DB5' }
const all = new Map<string, HubTab>(STAFF_HUBS.flatMap(h => h.tabs).map(t => [t.href, t]))

export default function StaffDashboard() {
  const { role, modules: teamModules } = useRole()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const roleModules = teamModules ?? ROLE_MODULES[role] ?? []
  const scTabs = getScTabs(role, roleModules)
  const allowed = (t: HubTab) => t.requiresModule ? roleModules.includes(t.requiresModule) : t.scTab ? scTabs.includes(t.scTab) : role !== 'Partner'
  const [d, setD] = useState<any>(null)
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const H = { Authorization: `Bearer ${session.access_token}` }
      fetch('/api/staff-dashboard?range=today', { headers: H }).then(r => r.ok ? r.json() : null).then(setD).catch(() => {})
    })()
  }, [])
  useEffect(() => { supabase.rpc('sidebar_counts').then(({ data }) => { if (data) setCounts(data as Record<string, number>) }) }, [])
  const team = (STAFF_HUBS.find(h => h.label === 'Team')?.tabs ?? []).filter(t => t.href !== '/staff-centre/staff' && allowed(t))
  const shared = SHARED.map(h => all.get(h)).filter((t): t is HubTab => !!t && allowed(t))
  const mods: any[] = d?.modules ?? []
  const pm = mods.find(m => m.key === 'pm'), ea = mods.find(m => m.key === 'ea')
  const openJobs = mods.reduce((a, m) => a + (Number((m.stats ?? []).find((x: any) => x.l === 'Open jobs')?.v) || 0), 0)
  const certs = (d?.attention ?? []).filter((a: any) => /certificate/i.test(a.title)).length
  const attn = ATTN.map(a => ({ ...a, n: counts[a.badge] ?? 0, ok: (() => { const t = all.get(a.href); return !t || allowed(t) })() })).filter(a => a.ok)
  const sec: React.CSSProperties = { margin: '26px 0 10px', fontSize: 16, fontWeight: 700, color: C.ink }
  const box: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px', boxShadow: shadow }
  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', boxShadow: shadow, textDecoration: 'none', display: 'block' }
  return (
    <div style={{ padding: '28px 30px 40px', maxWidth: 1100, fontFamily: 'inherit' }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.ink }}>Staff Dashboard</h1>
      <p style={{ margin: '6px 0 20px', fontSize: 14, color: C.muted, maxWidth: 560, lineHeight: 1.5 }}>Everything for your team in one place. The same pages run along the top of each one, so you can switch without coming back here.</p>
      <h2 style={{ ...sec, marginTop: 0 }}>Needs attention</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
        {attn.map(a => <Link key={a.badge} href={a.href} style={{ ...box, textDecoration: 'none', padding: '12px 14px' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: a.n > 0 ? '#EF4444' : C.ink }}>{a.n}</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>{a.label}</div></Link>)}
      </div>
      {(d?.attention ?? []).length > 0 && <div style={{ ...box, marginTop: 10 }}>
        {d.attention.map((a: any, i: number) => <Link key={i} href={a.href} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none', textDecoration: 'none' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TONE[a.tone] ?? C.muted, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: 13.5, color: C.ink }}>{a.title}</b><span style={{ fontSize: 12, color: C.muted }}>{a.sub}</span></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2f5bd6' }}>{a.action}</span></Link>)}
      </div>}

      <StaffDayTeamNotices />

      <h2 style={sec}>Business pulse</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        {[['Rent paid', pm?.stats?.find((x: any) => x.l === 'Rent paid')?.v ?? '—', '/pm'], ['Property Management let', pm ? `${pm.occ}%` : '—', '/pm'], ['Estate Agency let', ea ? `${ea.occ}%` : '—', '/estate'], ['Open jobs', d ? openJobs : '—', '/staff-centre/upkeep'], ['Certificates to renew', d ? certs : '—', '/staff-centre/compliance']].map(([l, v, h]) =>
          <Link key={String(l)} href={String(h)} style={{ ...box, textDecoration: 'none', padding: '12px 14px' }}><div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{v as any}</div><div style={{ fontSize: 12.5, color: C.muted }}>{l}</div></Link>)}
      </div>

      <h2 style={sec}>Your pages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 12 }}>
        {team.map(t => { const n = t.badge ? counts[t.badge] ?? 0 : 0; return (
          <Link key={t.href} href={t.href} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <b style={{ color: C.ink, fontSize: 15 }}>{t.label}</b>
              {n > 0 && <span style={{ minWidth: 20, padding: '1px 6px', borderRadius: 10, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>{n}</span>}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{WHAT[t.href] ?? ''}</div>
          </Link>) })}
      </div>
      {shared.length > 0 && <>
        <h2 style={{ margin: '28px 0 6px', fontSize: 16, fontWeight: 700, color: C.ink }}>Shared tools</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: C.muted }}>These open the real company-wide pages, so there is only one copy of each.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {shared.map(t => <Link key={t.href} href={t.href} style={{ background: '#eaf0fd', color: '#2f5bd6', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>{t.label}</Link>)}
        </div>
      </>}
    </div>
  )
}
