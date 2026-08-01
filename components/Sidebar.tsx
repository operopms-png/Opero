'use client'
import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRole, ROLE_MODULES } from '@/lib/useRole'

const NAV_GROUPS = [
  {
    label: 'Vacation Rentals',
    items: [
      { href: '/str', label: 'Vacation Rentals', key: 'str', icon: 'home' },
      { href: '/str/crm', label: 'CRM', key: 'str', icon: 'contacts' },
      { href: '/str/marketing', label: 'Marketing', key: 'str', icon: 'sparkles' },
      { href: '/str/sales', label: 'Sales', key: 'str', icon: 'trendingup' },
      { href: '/str/reporting', label: 'Reporting', key: 'str', icon: 'report' },
      { href: '/str/vendors', label: 'Contractors', key: 'str', icon: 'wrench' },
      { href: '/str/service', label: 'Service', key: 'str', icon: 'headset' },
      { href: '/owner-portal', label: 'Owners', key: 'str', icon: 'users' },
    ]
  },
  {
    label: 'Property Management',
    module: 'pm',
    modulePrice: '£99/mo',
    items: [
      { href: '/pm', label: 'Property Management', key: 'pm', icon: 'building' },
      { href: '/pm/crm', label: 'CRM', key: 'pm', icon: 'contacts' },
      { href: '/pm/marketing', label: 'Marketing', key: 'pm', icon: 'sparkles' },
      { href: '/pm/sales', label: 'Sales', key: 'pm', icon: 'trendingup' },
      { href: '/pm/reporting', label: 'Reporting', key: 'pm', icon: 'report' },
      { href: '/pm/vendors', label: 'Contractors', key: 'pm', icon: 'wrench' },
      { href: '/pm/service', label: 'Service', key: 'pm', icon: 'headset' },
    ]
  },
  {
    label: 'Estate Agency',
    module: 'estate',
    modulePrice: '£99/mo',
    items: [
      { href: '/estate', label: 'Estate Agency', key: 'estate', icon: 'building' },
      { href: '/estate/crm', label: 'CRM', key: 'estate', icon: 'contacts' },
      { href: '/estate/marketing', label: 'Marketing', key: 'estate', icon: 'sparkles' },
      { href: '/estate/sales', label: 'Sales', key: 'estate', icon: 'trendingup' },
      { href: '/estate/reporting', label: 'Reporting', key: 'estate', icon: 'report' },
    ]
  },
  {
    label: 'AI Property Manager',
    module: 'ai',
    modulePrice: '£79/mo',
    items: [
      { href: '/ai-manager', label: 'AI Property Manager', key: 'ai', icon: 'sparkles' },
    ]
  },
  {
    label: 'Invest',
    module: 'invest',
    roleOnly: true,
    items: [
      { href: '/invest', label: 'Deal Analyser', key: 'invest', icon: 'calculator' },
      { href: '/invest', label: 'Watchlist', key: 'invest', icon: 'bookmark' },
    ]
  },
  {
    label: 'Developments',
    module: 'dev',
    modulePrice: '£149/mo',
    items: [
      { href: '/dev', label: 'Developments', key: 'dev', icon: 'folder' },
      { href: '/dev/crm', label: 'CRM', key: 'dev', icon: 'contacts' },
      { href: '/dev/marketing', label: 'Marketing', key: 'dev', icon: 'sparkles' },
      { href: '/dev/sales', label: 'Sales', key: 'dev', icon: 'trendingup' },
      { href: '/dev/reporting', label: 'Reporting', key: 'dev', icon: 'report' },
      { href: '/dev/vendors', label: 'Contractors', key: 'dev', icon: 'wrench' },
      { href: '/dev/service', label: 'Service', key: 'dev', icon: 'headset' },
    ]
  },
]

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ['dashboard','properties','cleaning','maintenance','turnovers','team','pm','dev','str','estate','invest','ai','ai'],
  growth:       ['dashboard','properties','cleaning','maintenance','turnovers','bookings','owners','analytics','integrations','team','reports','documents','guest-comms','audit','pm','dev','str','estate','invest','ai','ai'],
  professional: ['dashboard','properties','cleaning','maintenance','turnovers','bookings','owners','analytics','integrations','team','reports','documents','guest-comms','audit','pm','dev','str','estate','invest','ai','ai'],
}

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 }
  const icons: Record<string, React.ReactElement> = {
    home:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    calendar: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    building: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    sparkles: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
    wrench:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    refresh:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    users:    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    chart:    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    plug:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M9 3v4m6-4v4M3 9h4m10 0h4"/></svg>,
    team:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    file:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    folder:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    message:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    shield:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    logout:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    revenue:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    bookmark: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
    bell:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
    search:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    map:      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    report:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>,
    headset:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
    contacts: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    trendingup: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    calculator: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>,
  }
  return icons[name] ?? <span style={{ width: size, height: size, display: 'block' }} />
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [modules, setModules] = useState<string[]>([])
  const [userEmail, setUserEmail] = useState('')
  const { role, hasSettings } = useRole()

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? '')
        const { data: sub } = await supabase.from('subscriptions').select('plan, modules').eq('user_id', user.id).single()
        if (sub) {
          if ((sub as any).plan) setPlan((sub as any).plan)
          if ((sub as any).modules) setModules((sub as any).modules ?? [])
        }
      }
    }
    loadPlan()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter

  const nav = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F2F4F7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.PNG" alt="Opero" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#101828', letterSpacing: '-0.3px' }}>Opero</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => {
          const roleModules = ROLE_MODULES[role] ?? ['str','pm','dev','estate']
          const hasModule = (group as any).roleOnly
            ? roleModules.includes((group as any).module)
            : (!group.module || group.module === 'ai' || (modules.includes(group.module) && roleModules.includes(group.module)))
          return (
            <div key={group.label}>
              {gi > 0 && <div style={{ height: 1, background: '#F2F4F7', margin: '6px 0' }} />}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {group.label}
                {!hasModule && (group as any).modulePrice && <span style={{ fontSize: 9, fontWeight: 700, background: '#F2F4F7', color: '#667085', padding: '2px 6px', borderRadius: 4 }}>{(group as any).modulePrice}</span>}
              </div>
              {group.items.map(({ href, icon, label, key, minPlan }: any) => {
                const hasAccess = hasModule && features.includes(key)
                const active = pathname === href.split('?')[0]
                return (
                  <Link key={href} href={hasModule ? href : '#'}
                    onClick={(e: any) => { if (!hasModule || !hasAccess) e.preventDefault(); else setOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, marginBottom: 1, textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 600 : 400, background: active ? '#EEF0FF' : 'transparent', color: !hasModule ? '#C1C9D2' : !hasAccess ? '#C1C9D2' : active ? '#3B4AFF' : '#344054', cursor: hasModule && hasAccess ? 'pointer' : 'not-allowed', opacity: !hasModule ? 0.5 : 1 }}>
                    <Icon name={icon} size={16} color={!hasModule ? '#C1C9D2' : !hasAccess ? '#C1C9D2' : active ? '#3B4AFF' : '#667085'} />
                    <span style={{ flex: 1, lineHeight: 1 }}>{label}</span>
                    {!hasModule && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C1C9D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                    {hasModule && !hasAccess && minPlan && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: minPlan === 'professional' ? '#1D2939' : '#EEF0FF', color: minPlan === 'professional' ? '#fff' : '#3B4AFF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{minPlan === 'professional' ? 'Pro' : 'Growth'}</span>}
                  </Link>
                )
              })}
              {!hasModule && (group as any).modulePrice && <a href="/modules" style={{ display: 'block', textAlign: 'center', fontSize: 11, fontWeight: 600, color: (group as any).module === 'dev' ? '#8B5CF6' : '#3B4AFF', background: (group as any).module === 'dev' ? '#EDE9FE' : '#EEF0FF', borderRadius: 6, padding: '5px 8px', textDecoration: 'none', margin: '4px 0 8px' }}>Unlock — {(group as any).modulePrice}</a>}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '10px', borderTop: '1px solid #F2F4F7' }}>
        {plan !== 'professional' && (
          <a href="/landing.html#pricing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: 7, background: '#3B4AFF', color: '#fff', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', marginBottom: 6 }}>
            Upgrade plan
          </a>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#3B4AFF', flexShrink: 0 }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#101828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail.split('@')[0]}</div>
            <div style={{ fontSize: 11, color: '#98A2B3', textTransform: 'capitalize' }}>{plan}</div>
          </div>
          <button onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#98A2B3', display: 'flex' }}>
            <Icon name="logout" size={14} color="#98A2B3" />
          </button>
        </div>
        {hasSettings&&<a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, textDecoration: 'none', fontSize: 13, color: '#667085', marginTop: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </a>}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @media(max-width:768px){.desktop-sidebar{display:none!important}.mobile-trigger{display:flex!important}}
        @media(min-width:769px){.mobile-trigger{display:none!important}.mobile-overlay{display:none!important}}
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .sidebar-nav a:hover { background: #F9FAFB !important; }
      `}</style>
      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />}
      <button
        className="mobile-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        style={{ display: 'none', position: 'fixed', top: 14, left: 14, zIndex: 45, width: 40, height: 40, borderRadius: 8, background: '#fff', border: '1px solid #EAECF0', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,24,40,0.08)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <aside style={{ display: open ? 'block' : 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, background: '#fff', zIndex: 50, borderRight: '1px solid #F2F4F7', fontFamily: "'Inter', sans-serif" }}>
        {nav}
      </aside>
      <aside className="sidebar-nav desktop-sidebar" style={{ width: 220, height: '100vh', background: '#fff', borderRight: '1px solid #F2F4F7', position: 'fixed', top: 0, left: 0, zIndex: 40, fontFamily: "'Inter', sans-serif", overflowY: 'auto' }}>
        {nav}
      </aside>
    </>
  )
}
