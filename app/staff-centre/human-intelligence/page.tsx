'use client'
// Staff Centre → Human Intelligence Hub: every people-run area in one place.
// Shows each hub with the pages this person can open (same rules as the sidebar and HubTabs).
import Link from 'next/link'
import { useRole, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { STAFF_HUBS, NON_HUMAN_HUBS, type HubTab } from '@/lib/staffHubs'

export default function HumanIntelligenceHub() {
  const { role, modules: teamModules } = useRole()
  const roleModules = teamModules ?? ROLE_MODULES[role] ?? []
  const scTabs = getScTabs(role, roleModules)
  const allowed = (t: HubTab) => t.requiresModule ? roleModules.includes(t.requiresModule) : t.scTab ? scTabs.includes(t.scTab) : role !== 'Partner'
  const hubs = STAFF_HUBS.filter(h => !NON_HUMAN_HUBS.includes(h.label))
    .map(h => ({ hub: h, tabs: h.tabs.filter(t => allowed(t)) }))
    .filter(x => x.tabs.length > 0)

  return (
    <div style={{ padding: '28px 30px 40px', fontFamily: 'inherit' }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1D4E89' }}>Human Intelligence Hub</h1>
      <p style={{ margin: '6px 0 22px', fontSize: 14, color: '#667085', maxWidth: 640 }}>Everything your people run: inbox, clients, finance, scheduling, operations and your team. Novourq Cloud AI drafts the work; you decide.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {hubs.map(({ hub, tabs }) => (
          <div key={hub.label} style={{ background: '#fff', border: '1px solid #D9E2F0', borderRadius: 12, padding: '16px 18px', minWidth: 0 }}>
            <Link href={tabs[0].href} style={{ fontSize: 16, fontWeight: 700, color: '#1D4E89', textDecoration: 'none' }}>{hub.label}</Link>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {tabs.filter(t => !t.hidden).map(t => (
                <Link key={t.href} href={t.href} style={{ fontSize: 13.5, color: '#344054', textDecoration: 'none' }}>{t.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
