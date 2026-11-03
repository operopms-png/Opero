'use client'
// Property: estate agency, developments, vacation rentals and property management in one place.
// Every page is listed once under a function heading. The chips show which area holds the
// records and open that area's version of the page.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRole, ROLE_MODULES } from '@/lib/useRole'

type Mod = 'pm' | 'ea' | 'str' | 'dev'
type Target = { mod: Mod; tab: string }
type Item = { name: string; targets: Target[]; shared?: boolean }
const AREA: Record<Mod, string> = { pm: 'Lettings', ea: 'Estate agency', str: 'Short stays', dev: 'Developments' }
const HREF = (t: Target) => t.mod === 'pm' ? `/pm?tab=${encodeURIComponent(t.tab)}` : t.mod === 'ea' ? `/estate?section=${encodeURIComponent(t.tab)}` : t.mod === 'str' ? `/str?tab=${encodeURIComponent(t.tab)}` : `/dev?tab=${encodeURIComponent(t.tab)}`
const pm = (tab: string): Target => ({ mod: 'pm', tab })
const ea = (tab: string): Target => ({ mod: 'ea', tab })
const str = (tab: string): Target => ({ mod: 'str', tab })
const dev = (tab: string): Target => ({ mod: 'dev', tab })

const GROUPS: { name: string; note: string; items: Item[] }[] = [
  { name: 'Portfolio', note: 'Properties, people and tenancies', items: [
    { name: 'Properties', targets: [pm('Properties'), ea('Properties'), str('Properties')] },
    { name: 'Units', targets: [pm('Units'), ea('Units')] },
    { name: 'Buildings', targets: [pm('Buildings'), ea('Buildings')] },
    { name: 'Landlords', targets: [pm('Landlords'), ea('Landlords')] },
    { name: 'Tenants', targets: [pm('Tenants'), ea('Tenants')] },
    { name: 'Leases and tenancies', targets: [pm('Leases'), ea('Tenancies')] },
    { name: 'Head leases', targets: [pm('Head Leases')] },
    { name: 'HMO rooms', targets: [pm('HMO Rooms')] },
  ] },
  { name: 'Lettings and sales', note: 'Marketing and moving people in', items: [
    { name: 'Vacancies', targets: [pm('Vacancies'), ea('Vacancies')] },
    { name: 'Viewings', targets: [pm('Viewings'), ea('Viewings')] },
    { name: 'Renewals and notices', targets: [pm('Renewals & Notices')] },
    { name: 'Furniture', targets: [pm('Furniture')] },
  ] },
  { name: 'Short stays', note: 'Guests and bookings', items: [
    { name: 'Bookings', targets: [str('Bookings')] },
    { name: 'Reviews', targets: [pm('Reviews')] },
    { name: 'Guest comms', targets: [str('Guest Comms')] },
    { name: 'Channels', targets: [pm('Channels')] },
    { name: 'Analytics', targets: [str('Analytics')] },
    { name: 'Integrations', targets: [str('Integrations')] },
  ] },
  { name: 'Developments', note: 'Projects from plan to sale', items: [
    { name: 'Projects', targets: [dev('Projects')] },
    { name: 'Checklist', targets: [dev('Checklist')] },
    { name: 'Budget', targets: [dev('Budget')] },
    { name: 'Investors', targets: [dev('Investors')] },
    { name: 'Milestones', targets: [dev('Milestones')] },
  ] },
  { name: 'Compliance', note: 'Certificates, checks and deposits', items: [
    { name: 'Compliance', targets: [pm('Compliance'), ea('Compliance')] },
    { name: 'Tenant checks', targets: [pm('Tenant Checks'), ea('Tenant Checks')] },
    { name: 'Deposits', targets: [pm('Deposits')] },
    { name: 'Insurance', targets: [pm('Insurance')] },
    { name: 'Deadlines', targets: [pm('Deadlines')] },
    { name: 'Inventories', targets: [pm('Inventories'), ea('Inventories')] },
  ] },
  { name: 'Operations', note: 'Keeping homes running', items: [
    { name: 'Maintenance', targets: [pm('Maintenance'), str('Maintenance'), ea('Maintenance')] },
    { name: 'Cleaning', targets: [pm('Cleaning'), str('Cleaning'), ea('Cleaning')] },
    { name: 'Inspections', targets: [pm('Inspections')] },
    { name: 'Keys', targets: [pm('Keys')] },
    { name: 'Utilities', targets: [pm('Utilities')] },
    { name: 'Team', targets: [str('Team')] },
  ] },
  { name: 'Finance', note: 'Money in and out', items: [
    { name: 'Finance', targets: [pm('Finance'), ea('Finance')] },
    { name: 'Rent', targets: [pm('Rent'), ea('Rent Collection')] },
    { name: 'Expenses', targets: [pm('Expenses'), str('Expenses'), dev('Expenses'), ea('Expenses')] },
    { name: 'Banking', targets: [pm('Banking'), str('Banking'), dev('Banking'), ea('Banking')] },
    { name: 'Loans and mortgages', targets: [pm('Loans & Mortgages'), ea('Loans & Mortgages')] },
    { name: 'Exchange rates', targets: [pm('Exchange Rates')] },
  ] },
  { name: 'Reports', note: 'What the numbers say', items: [
    { name: 'Landlord reports', targets: [pm('Landlord Reports'), ea('Landlord Reports')] },
    { name: 'Reports', targets: [pm('Reports'), str('Reports'), dev('Reports'), ea('Reports')] },
    { name: 'Accounting export', targets: [pm('Accounting Export')] },
    { name: 'Unit profit', targets: [pm('Unit Profit')] },
  ] },
  { name: 'Documents', note: 'Records and company files', items: [
    { name: 'Documents', targets: [pm('Documents'), dev('Documents'), ea('Documents')] },
    { name: 'Company SOPs', targets: [pm('Company SOPs')], shared: true },
    { name: 'Contract templates', targets: [pm('Contract Templates')], shared: true },
    { name: 'Audit log', targets: [pm('Audit Log')] },
    { name: 'Messages', targets: [pm('Messages')] },
  ] },
]

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#dfe6f4', chip: '#e3edff', chipText: '#1d3f9e' }
const shadow = '0 1px 2px rgba(16,35,77,.05), 0 8px 24px rgba(16,35,77,.06)'

export default function PropertyHub() {
  const { role, modules: teamModules } = useRole()
  const roleModules = teamModules ?? ROLE_MODULES[role] ?? []
  const [cat, setCat] = useState(0)
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const has = (m: Mod) => roleModules.includes(m)

  // Only show the areas this person can open; hide a page with none left.
  const groups = useMemo(() => GROUPS.map(g => ({
    ...g,
    items: g.items.map(i => ({ ...i, targets: i.targets.filter(t => has(t.mod)) })).filter(i => i.targets.length),
  })).filter(g => g.items.length), [roleModules.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = term
    ? [{ name: 'Results', note: `Pages matching "${q.trim()}"`, items: groups.flatMap(g => g.items).filter(i => i.name.toLowerCase().includes(term)) }]
    : [groups[Math.min(cat, Math.max(0, groups.length - 1))]].filter(Boolean)

  const row = (i: Item) => (
    <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
      <b style={{ color: C.ink, fontSize: 14.5, fontWeight: 600 }}>{i.name}</b>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {i.shared
          ? <Link href={HREF(i.targets[0])} style={chip}>All areas</Link>
          : i.targets.map(t => <Link key={t.mod} href={HREF(t)} style={chip}>{AREA[t.mod]}</Link>)}
      </div>
    </div>
  )

  return (
    <div style={{ background: 'linear-gradient(180deg,#eaf3ff,#d9e9fd)', minHeight: '100vh', padding: '24px 28px 48px', fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: C.ink, letterSpacing: '-.01em' }}>Property</h1>
        <p style={{ margin: '4px 0 14px', fontSize: 14, color: C.text }}>Estate agency, developments, vacation rentals and property management in one place. Each page appears once.</p>
        <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Search pages, e.g. maintenance" aria-label="Search pages"
          style={{ width: '100%', maxWidth: 340, fontFamily: 'inherit', fontSize: 14, color: C.ink, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', marginBottom: 14 }} />
        <div className="prop-grid" style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          <nav aria-label="Property areas" className="prop-cats" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: shadow }}>
            {groups.map((g, i) => {
              const on = !term && i === cat
              return (
                <button key={g.name} type="button" aria-pressed={on} onClick={() => { setCat(i); setQ('') }}
                  style={{ font: 'inherit', fontSize: 14, textAlign: 'left', border: 0, background: on ? C.soft : 'none', color: on ? C.ink : C.text, fontWeight: on ? 600 : 400, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, whiteSpace: 'nowrap' }}>
                  <span>{g.name}</span><small style={{ color: C.muted, fontSize: 12 }}>{g.items.length}</small>
                </button>
              )
            })}
          </nav>
          <section style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, minWidth: 0, boxShadow: shadow }}>
            {shown.map(g => (
              <div key={g.name}>
                <h2 style={{ margin: 0, fontSize: 18, color: C.ink }}>{g.name}</h2>
                <p style={{ margin: '3px 0 14px', fontSize: 13, color: C.muted }}>{g.note}</p>
                {g.items.length ? g.items.map(row) : <p style={{ fontSize: 14, color: C.muted }}>No page matches that.</p>}
              </div>
            ))}
          </section>
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14 }}>Lettings is Property Management. Short stays is Vacation Rentals. Chips open that area&apos;s version of the page.</p>
      </div>
      <style>{`@media (max-width: 720px){ .prop-grid{ grid-template-columns: 1fr !important } .prop-cats{ flex-direction: row !important; overflow-x: auto } }`}</style>
    </div>
  )
}

const chip: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: C.chipText, background: C.chip, borderRadius: 999, padding: '4px 10px', textDecoration: 'none' }
