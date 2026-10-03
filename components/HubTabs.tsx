'use client'
// Tabs along the top of Staff Centre pages that share one sidebar link
// (e.g. Inbox → Conversations · Email · Airbnb Inbox · Website Chats · AI Assistant).
// Hubs and their tabs live in lib/staffHubs.ts. Only tabs this person can open
// are shown, and the bar is hidden when that leaves fewer than two.
// Full-height pages subtract the bar via calc(100vh - var(--hub-h, 0px)).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { hubFor, tabMatches, type HubTab } from '@/lib/staffHubs'

const BAR_H = 45

export default function HubTabs() {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const { role, modules: teamModules } = useRole()

  useEffect(() => {
    const read = () => setSearch(window.location.search)
    read(); window.addEventListener('popstate', read); window.addEventListener('opero:nav', read)
    return () => { window.removeEventListener('popstate', read); window.removeEventListener('opero:nav', read) }
  }, [pathname])

  // same rules as the sidebar (components/Sidebar.tsx → itemAllowed)
  const roleModules = teamModules ?? ROLE_MODULES[role] ?? []
  const scTabs = getScTabs(role, roleModules)
  const allowed = (t: HubTab) => t.requiresModule ? roleModules.includes(t.requiresModule) : t.scTab ? scTabs.includes(t.scTab) : role !== 'Partner'

  const hub = hubFor(pathname, search)
  const tabs = hub ? hub.tabs.filter(allowed) : []
  const show = tabs.length > 1
  const wantsCounts = show && tabs.some(t => t.badge)

  useEffect(() => { document.documentElement.style.setProperty('--hub-h', show ? BAR_H + 'px' : '0px') }, [show])
  useEffect(() => {
    if (!wantsCounts) return
    supabase.rpc('sidebar_counts').then(({ data }) => { if (data) setCounts(data as Record<string, number>) })
  }, [wantsCounts, pathname])

  if (!show || !hub) return null
  return (
    <div className="hub-tabs" style={{ height: BAR_H, boxSizing: 'border-box', display: 'flex', alignItems: 'stretch', gap: 4, padding: '0 22px', background: '#fff', borderBottom: '1px solid #EADBB8', overflowX: 'auto', overflowY: 'hidden', fontFamily: 'Figtree, Inter, -apple-system, sans-serif', position: 'sticky', top: 0, zIndex: 20 }}>
      <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#8A6B2E', paddingRight: 12, marginRight: 4, borderRight: '1px solid #EFE4CC', whiteSpace: 'nowrap' }}>{hub.label}</span>
      {tabs.map(t => {
        const on = tabMatches(t, pathname, search)
        const n = t.badge ? counts[t.badge] ?? 0 : 0
        return (
          <Link key={t.href} href={t.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', borderBottom: '2px solid ' + (on ? '#A8862E' : 'transparent'), color: on ? '#191815' : '#676879', fontWeight: on ? 600 : 500, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {t.label}
            {n > 0 && <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n > 99 ? '99+' : n}</span>}
          </Link>
        )
      })}
    </div>
  )
}
