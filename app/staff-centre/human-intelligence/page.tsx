'use client'
// Staff Centre → Human Intelligence Hub: every people-run area, grouped under four headings.
// A list of headings on the left, the areas and their pages on the right, and a search box.
// Only pages this person can open are shown (same rules as the sidebar and HubTabs).
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRole, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { STAFF_HUBS, type HubTab, type Hub } from '@/lib/staffHubs'

const GROUPS: { name: string; note: string; hubs: string[] }[] = [
  { name: 'Clients and sales', note: 'Everyone you deal with', hubs: ['Inbox', 'CRM', 'Client Properties', 'Owners & Tenants', 'Partners & Investors', 'Marketing'] },
  { name: 'Money', note: 'Income, tax and reporting', hubs: ['Finance', 'Tax Compliance', 'Reports'] },
  { name: 'Operations', note: 'Running the properties', hubs: ['Operations', 'Schedule', 'Smart Home', 'Portals'] },
  { name: 'Company', note: 'Your team and records', hubs: ['Company Documents', 'Team'] },
]

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'

export default function HumanIntelligenceHub() {
  const { role, modules: teamModules } = useRole()
  const [cat, setCat] = useState(0)
  const [q, setQ] = useState('')
  const roleModules = teamModules ?? ROLE_MODULES[role] ?? []
  const scTabs = getScTabs(role, roleModules)
  const allowed = (t: HubTab) => t.requiresModule ? roleModules.includes(t.requiresModule) : t.scTab ? scTabs.includes(t.scTab) : role !== 'Partner'
  const term = q.trim().toLowerCase()

  const groups = useMemo(() => {
    const byName = new Map<string, Hub>(STAFF_HUBS.map(h => [h.label, h]))
    return GROUPS.map(g => ({
      ...g,
      areas: g.hubs.map(n => byName.get(n)).filter((h): h is Hub => !!h).map(h => {
        const tabs = h.tabs.filter(t => !t.hidden && allowed(t))
        const hit = !term || h.label.toLowerCase().includes(term)
        return { hub: h, tabs: hit ? tabs : tabs.filter(t => t.label.toLowerCase().includes(term)) }
      }).filter(a => a.tabs.length > 0),
    })).filter(g => g.areas.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, role, teamModules])

  const cur = groups[Math.min(cat, Math.max(groups.length - 1, 0))]

  return (
    <div style={{ padding: '28px 30px 40px', fontFamily: 'inherit', maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>Human Intelligence Hub</h1>
      <p style={{ margin: '6px 0 18px', fontSize: 14, color: C.muted, maxWidth: 560, lineHeight: 1.5 }}>Everything your people run. Novourq Cloud AI drafts the work and you decide.</p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0 14px', height: 46, boxShadow: shadow }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input value={q} onChange={e => { setQ(e.target.value); setCat(0) }} placeholder="Search any page, such as arrears or viewings" autoComplete="off"
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 14, color: C.ink }} />
      </label>

      {!cur ? (
        <p style={{ marginTop: 22, fontSize: 14, color: C.muted }}>Nothing matches that search.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 240px) 1fr', gap: 16, marginTop: 16, alignItems: 'start' }} className="hih-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, boxShadow: shadow }}>
            {groups.map((g, i) => {
              const on = groups[Math.min(cat, groups.length - 1)] === g
              return (
                <button key={g.name} type="button" onClick={() => setCat(i)} aria-pressed={on}
                  style={{ display: 'flex', flexDirection: 'column', gap: 2, font: 'inherit', textAlign: 'left', border: 0, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: on ? C.soft : 'transparent', color: on ? C.ink : C.text }}>
                  <span style={{ fontSize: 14, fontWeight: on ? 700 : 500 }}>{g.name}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{g.areas.length} area{g.areas.length === 1 ? '' : 's'}</span>
                </button>
              )
            })}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '20px 22px', boxShadow: shadow, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: C.ink }}>{cur.name}</h2>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: C.muted }}>{cur.note}</p>
            {cur.areas.map(({ hub, tabs }) => (
              <div key={hub.label} style={{ borderTop: `1px solid ${C.line}`, padding: '14px 0', display: 'grid', gridTemplateColumns: 'minmax(130px, 180px) 1fr', gap: 12 }} className="hih-row">
                <Link href={tabs[0].href} style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, textDecoration: 'none' }}>{hub.label}</Link>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                  {tabs.map(t => <Link key={t.href} href={t.href} style={{ fontSize: 13.5, color: C.text, textDecoration: 'none', padding: '4px 0' }}>{t.label}</Link>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@media (max-width: 720px){ .hih-grid{ grid-template-columns: 1fr !important } .hih-row{ grid-template-columns: 1fr !important } }`}</style>
    </div>
  )
}
