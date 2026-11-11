'use client'
// Property: estate agency, developments, vacation rentals and property management in one place.
// Every page is listed once under a function heading. The chips show which area holds the
// records and open that area's version of the page.
import { useMemo, useState } from 'react'
import GlanceTiles from '@/components/property/GlanceTiles'
import Link from 'next/link'
import { useRole, ROLE_MODULES } from '@/lib/useRole'

type Mod = 'pm' | 'ea' | 'str' | 'dev'
type Target = { mod: Mod; tab: string }
type Item = { name: string; targets: Target[]; shared?: boolean; href?: string }
const AREA: Record<Mod, string> = { pm: 'Property Management', ea: 'Estate Agency', str: 'Vacation Rentals', dev: 'Developments' }
// What each area means, shown on the chips so nobody has to guess which one to open.
const MEANS: Record<Mod, string> = { pm: 'We manage the property for the landlord', ea: 'We let or sell the property for the landlord', str: 'Guest bookings and short stays', dev: 'Building and selling new projects' }
const HREF = (t: Target) => t.mod === 'pm' ? `/pm?tab=${encodeURIComponent(t.tab)}` : t.mod === 'ea' ? `/estate?section=${encodeURIComponent(t.tab)}` : t.mod === 'str' ? `/str?tab=${encodeURIComponent(t.tab)}` : `/dev?tab=${encodeURIComponent(t.tab)}`
const pm = (tab: string): Target => ({ mod: 'pm', tab })
const ea = (tab: string): Target => ({ mod: 'ea', tab })
const str = (tab: string): Target => ({ mod: 'str', tab })
const dev = (tab: string): Target => ({ mod: 'dev', tab })

// Where do I go? Plain tasks that open the right page. Where the answer depends on the type of property, each area is offered.
const TASKS: { task: string; targets: Target[]; href?: string }[] = [
  { task: 'Add a tenant', targets: [pm('Tenants'), ea('Tenants')] },
  { task: 'Check a tenant’s ID and income', targets: [pm('Tenant Checks'), ea('Tenant Checks')] },
  { task: 'Add a landlord', targets: [pm('Landlords'), ea('Landlords')] },
  { task: 'Add a property', targets: [pm('Properties'), ea('Properties'), str('Properties')] },
  { task: 'Add a guest booking', targets: [str('Bookings')] },
  { task: 'Chase rent', targets: [pm('Rent'), ea('Rent Collection')] },
  { task: 'Log a repair', targets: [pm('Maintenance'), ea('Maintenance'), str('Maintenance')] },
  { task: 'Book a viewing', targets: [pm('Viewings'), ea('Viewings')] },
  { task: 'Send a landlord or tenant their link', targets: [], href: '/staff-centre/documents' },
]

const GROUPS: { name: string; note: string; items: Item[] }[] = [
  { name: 'Overview', note: 'Dashboards for each area', items: [
    { name: 'Dashboard', targets: [pm('Dashboard'), ea('Dashboard'), str('Home'), dev('Dashboard')] },
    { name: 'Map', targets: [pm('Properties')], href: '/property/map' },
  ] },
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
    { name: 'Rent reviews', targets: [pm('Rent Reviews')] },
    { name: 'Referrals', targets: [pm('Referrals')] },
    { name: 'Landlord feedback', targets: [pm('Landlord Feedback')] },
    { name: 'Tenant feedback', targets: [pm('Tenant Feedback')] },
    { name: 'Furniture', targets: [pm('Furniture')] },
  ] },
  { name: 'Vacation Rentals', note: 'Guests and bookings', items: [
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
    { name: 'Legal and disputes', targets: [pm('Legal & Disputes')] },
    { name: 'Deadlines', targets: [pm('Deadlines')] },
    { name: 'Inventories', targets: [pm('Inventories'), ea('Inventories')] },
  ] },
  { name: 'Operations', note: 'Keeping homes running', items: [
    { name: 'Maintenance', targets: [pm('Maintenance'), str('Maintenance'), ea('Maintenance')] },
    { name: 'Planned maintenance', targets: [pm('Planned Maintenance')] },
    { name: 'Contractors', targets: [pm('Maintenance')], href: '/pm/vendors' },
    { name: 'Emergency contacts', targets: [pm('Emergency Contacts')] },
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
    { name: 'Service charges and ground rent', targets: [pm('Service Charges')] },
    { name: 'Valuations', targets: [pm('Valuations')] },
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

const C = { ink: '#10234d', text: '#34456b', muted: '#6b7a9f', blue: '#2f5bd6', soft: '#eaf0fd', line: '#e4e9f4' }
const shadow = '0 1px 2px rgba(16,35,77,.04)'

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

  const found = term ? groups.flatMap(g => g.items).filter(i => i.name.toLowerCase().includes(term)) : []
  const active = groups[Math.min(cat, Math.max(0, groups.length - 1))]

  const row = (i: Item) => (
    <div key={i.name} className="prop-row" style={{ display: 'grid', gridTemplateColumns: '190px minmax(0,1fr)', gap: 12, alignItems: 'center', padding: '17px 0', borderTop: `1px solid ${C.line}` }}>
      <b style={{ color: C.ink, fontSize: 15, fontWeight: 600 }}>{i.name}</b>
      <div style={{ display: 'flex', gap: '6px 22px', flexWrap: 'wrap' }}>
        {i.href
          ? <Link href={i.href} style={link}>Open map</Link>
          : i.shared
          ? <Link href={HREF(i.targets[0])} style={link}>All areas</Link>
          : i.targets.map(t => <Link key={t.mod} href={HREF(t)} title={MEANS[t.mod]} style={link}>{AREA[t.mod]}</Link>)}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#f6f8fc', minHeight: '100vh', padding: '28px 32px 56px', fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 20px', marginBottom: 18, boxShadow: shadow }}>
          <b style={{ display: 'block', color: C.ink, fontSize: 16, fontWeight: 700 }}>Where do I go?</b>
          <p style={{ margin: '2px 0 12px', fontSize: 13.5, color: C.muted }}>Pick what you want to do and we open the right page. {(['pm', 'ea', 'str'] as Mod[]).filter(has).map(m => `${AREA[m]}: ${MEANS[m].toLowerCase()}`).join('. ')}.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 10 }}>
            {TASKS.map(t => {
              const ts = t.targets.filter(x => has(x.mod))
              if (!t.href && !ts.length) return null
              return (
                <div key={t.task} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px' }}>
                  <b style={{ display: 'block', color: C.ink, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{t.task}</b>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.href ? <Link href={t.href} style={chip}>Open</Link> : ts.map(x => <Link key={x.mod + x.tab} href={HREF(x)} title={MEANS[x.mod]} style={chip}>{ts.length > 1 ? AREA[x.mod] : 'Open'}</Link>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0 16px', marginBottom: 18, boxShadow: shadow }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Search any page, such as maintenance or viewings" aria-label="Search pages"
            style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 15, color: C.ink, background: 'none', border: 0, padding: '15px 0', outline: 0 }} />
        </label>
        <p className="prop-hint" style={{ display: 'none', margin: '0 2px 8px', fontSize: 12.5, color: C.muted }}>Swipe sideways for all {groups.length} areas, including Operations and Finance</p>
        <div className="prop-grid" style={{ display: 'grid', gridTemplateColumns: '240px minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          <nav aria-label="Real Estate Intelligence areas" className="prop-cats" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, display: 'flex', flexDirection: 'column', gap: 2, boxShadow: shadow }}>
            {groups.map((g, i) => {
              const on = !term && g === active
              return (
                <button key={g.name} type="button" aria-pressed={on} onClick={() => { setCat(i); setQ('') }}
                  style={{ font: 'inherit', textAlign: 'left', border: 0, background: on ? C.soft : 'none', color: C.ink, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <b style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{g.name}</b>
                  <small style={{ display: 'block', fontSize: 12.5, color: C.muted, marginTop: 2 }}>{g.items.length} pages</small>
                </button>
              )
            })}
          </nav>
          <section style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '22px 24px', minWidth: 0, boxShadow: shadow }}>
            {term ? (
              <div>
                <h2 style={{ margin: 0, fontSize: 21, color: C.ink }}>Results</h2>
                <p style={{ margin: '3px 0 14px', fontSize: 14, color: C.muted }}>{found.length} page{found.length === 1 ? '' : 's'} match</p>
                {found.map(row)}
              </div>
            ) : active ? (
              <div>
                <h2 style={{ margin: 0, fontSize: 21, color: C.ink }}>{active.name}</h2>
                <p style={{ margin: '3px 0 14px', fontSize: 14, color: C.muted }}>{active.note}</p>
                {active.items.map(row)}
              </div>
            ) : <p style={{ fontSize: 14, color: C.muted }}>No Real Estate Intelligence pages are available for your role.</p>}
          </section>
        </div>
        <GlanceTiles show={{ str: has('str'), pm: has('pm'), ea: has('ea'), dev: has('dev') }} />
      </div>
      <style>{`@media (max-width: 760px){ .prop-grid{ grid-template-columns: 1fr !important } .prop-cats{ flex-direction: row !important; overflow-x: auto; -webkit-mask-image: linear-gradient(to right, #000 85%, transparent); mask-image: linear-gradient(to right, #000 85%, transparent); padding-right: 36px !important } .prop-hint{ display: block !important } .prop-row{ grid-template-columns: 1fr !important; gap: 6px !important } }`}</style>
    </div>
  )
}

const chip: React.CSSProperties = { background: '#eaf0fd', color: '#2f5bd6', fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 8, textDecoration: 'none' }
const link: React.CSSProperties = { color: '#34456b', fontSize: 14.5, textDecoration: 'none' }
