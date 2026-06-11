'use client'
import React from 'react'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',    label: 'Home',           key: 'dashboard',    icon: 'home' },
  { href: '/bookings',     label: 'Bookings',        key: 'bookings',     icon: 'calendar', minPlan: 'growth' },
  { href: '/properties',   label: 'Properties',      key: 'properties',   icon: 'building' },
  { href: '/cleaning',     label: 'Cleaning',        key: 'cleaning',     icon: 'sparkles' },
  { href: '/maintenance',  label: 'Maintenance',     key: 'maintenance',  icon: 'wrench' },
  { href: '/turnovers',    label: 'Turnovers',       key: 'turnovers',    icon: 'refresh' },
  { href: '/owners',       label: 'Owner Reports',   key: 'owners',       icon: 'users', minPlan: 'growth' },
  { href: '/analytics',    label: 'Analytics',       key: 'analytics',    icon: 'chart', minPlan: 'growth' },
  { href: '/integrations', label: 'Integrations',    key: 'integrations', icon: 'plug', minPlan: 'growth' },
  { href: '/team',         label: 'Team',            key: 'team',         icon: 'team' },
  { href: '/reports',      label: 'Reports',         key: 'reports',      icon: 'file', minPlan: 'professional' },
  { href: '/documents',    label: 'Documents',       key: 'documents',    icon: 'folder', minPlan: 'professional' },
  { href: '/guest-comms',  label: 'Guest Comms',     key: 'guest-comms',  icon: 'message', minPlan: 'professional' },
  { href: '/audit',        label: 'Audit Log',       key: 'audit',        icon: 'shield', minPlan: 'professional' },
]

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'team'],
  growth:       ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations', 'team'],
  professional: ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations', 'team', 'reports', 'documents', 'guest-comms', 'audit'],
}

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 }
  const icons: Record<string, React.ReactElement> = {
    home: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    calendar: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    building: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    sparkles: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
    wrench: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    refresh: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    users: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    chart: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    plug: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M9 3v4m6-4v4M3 9h4m10 0h4M5 19l-2 2M19 5l2-2"/></svg>,
    team: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    file: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    folder: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    message: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    shield: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    logout: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    lock: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  }
  return icons[name] ?? <span style={{ width: size, height: size, display: 'block' }} />
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? '')
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
        if (sub && (sub as any).plan) setPlan((sub as any).plan)
      }
    }
    loadPlan()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F2F4F7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.PNG" alt="Opero" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#101828', letterSpacing: '-0.3px' }}>Opero</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {NAV.map(({ href, icon, label, key, minPlan }) => {
          const hasAccess = features.includes(key)
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={hasAccess ? href : '#'}
              onClick={e => { if (!hasAccess) e.preventDefault(); else setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 600 : 400,
                background: active ? '#EEF0FF' : 'transparent',
                color: !hasAccess ? '#C1C9D2' : active ? '#3B4AFF' : '#344054',
                cursor: hasAccess ? 'pointer' : 'not-allowed',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <Icon name={icon} size={16} color={!hasAccess ? '#C1C9D2' : active ? '#3B4AFF' : '#667085'} />
              <span style={{ flex: 1, lineHeight: 1 }}>{label}</span>
              {!hasAccess && minPlan && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                  background: minPlan === 'professional' ? '#1D2939' : '#EEF0FF',
                  color: minPlan === 'professional' ? '#fff' : '#3B4AFF',
                  textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  {minPlan === 'professional' ? 'Pro' : 'Growth'}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '10px', borderTop: '1px solid #F2F4F7' }}>
        {plan !== 'professional' && (
          <a href="/landing.html#pricing" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px', borderRadius: 7, background: '#3B4AFF',
            color: '#fff', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
            marginBottom: 6, gap: 6,
          }}>
            ⚡ Upgrade plan
          </a>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, marginBottom: 4 }}>
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
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .sidebar-nav a:hover { background: #F9FAFB !important; }
      `}</style>

      {/* Mobile top bar */}
      <div className="mobile-menu-btn" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, background: '#fff', borderBottom: '1px solid #F2F4F7', display: 'none', alignItems: 'center', padding: '0 16px', zIndex: 50, gap: 12 }}>
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#344054' }}>☰</button>
        <img src="/logo.PNG" alt="Opero" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>Opero</span>
      </div>

      {/* Mobile overlay */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />}

      {/* Mobile sidebar */}
      <aside style={{ display: open ? 'block' : 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: 240, background: '#fff', zIndex: 50, borderRight: '1px solid #F2F4F7', fontFamily: "'Inter', sans-serif" }}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="sidebar-nav" style={{ width: 220, minHeight: '100vh', background: '#fff', borderRight: '1px solid #F2F4F7', position: 'fixed', top: 0, left: 0, zIndex: 40, fontFamily: "'Inter', sans-serif" }}>
        {sidebarContent}
      </aside>
    </>
  )
}
