'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',    icon: '▦',  label: 'Dashboard',       key: 'dashboard' },
  { href: '/properties',   icon: '🏠', label: 'Properties',      key: 'properties' },
  { href: '/cleaning',     icon: '🧹', label: 'Cleaning',        key: 'cleaning' },
  { href: '/maintenance',  icon: '🔧', label: 'Maintenance',     key: 'maintenance' },
  { href: '/turnovers',    icon: '🔄', label: 'Turnovers',       key: 'turnovers' },
  { href: '/bookings',     icon: '📅', label: 'Bookings',        key: 'bookings',     minPlan: 'growth' },
  { href: '/owners',       icon: '👤', label: 'Owner Reports',   key: 'owners',       minPlan: 'growth' },
  { href: '/analytics',    icon: '📊', label: 'Analytics',       key: 'analytics',    minPlan: 'growth' },
  { href: '/integrations', icon: '🔌', label: 'Integrations',    key: 'integrations', minPlan: 'growth' },
  { href: '/team',         icon: '👥', label: 'Team',            key: 'team' },
  { href: '/reports',      icon: '📈', label: 'Advanced Reports',key: 'reports',      minPlan: 'professional' },
  { href: '/documents',    icon: '🗂️', label: 'Documents',       key: 'documents',    minPlan: 'professional' },
  { href: '/statements',   icon: '💷', label: 'Statements',      key: 'statements',   minPlan: 'professional' },
  { href: '/guest-comms',  icon: '💬', label: 'Guest Comms',     key: 'guest-comms',  minPlan: 'professional' },
  { href: '/portfolio',    icon: '🏢', label: 'Portfolio',       key: 'portfolio',    minPlan: 'professional' },
  { href: '/audit',        icon: '🔍', label: 'Audit Log',       key: 'audit',        minPlan: 'professional' },
]

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'team'],
  growth:       ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations', 'team'],
  professional: ['dashboard', 'properties', 'cleaning', 'maintenance', 'turnovers', 'bookings', 'owners', 'analytics', 'integrations', 'reports', 'documents', 'statements', 'guest-comms', 'portfolio', 'audit', 'team'],
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState('starter')

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
        if (sub?.plan) setPlan(sub.plan)
      }
    }
    loadPlan()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/landing.html'
  }

  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter

  const sidebarContent = (
    <>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.PNG" alt="Opero" style={{ width: 50, height: 50, objectFit: 'contain' }} />
      </div>
      <nav style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(({ href, icon, label, key, minPlan }) => {
          const hasAccess = features.includes(key)
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={hasAccess ? href : '#'}
              onClick={(e) => { if (!hasAccess) e.preventDefault(); else setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, fontWeight: 500,
                background: active && hasAccess ? '#2563EB' : 'transparent',
                color: !hasAccess ? '#C4C9D4' : active ? '#fff' : '#6B7280',
                cursor: hasAccess ? 'pointer' : 'not-allowed',
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', opacity: hasAccess ? 1 : 0.4 }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {!hasAccess && minPlan && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: minPlan === 'professional' ? '#1a1a2e' : '#EEF2FF', color: minPlan === 'professional' ? '#fff' : '#5B7BF8', textTransform: 'uppercase' }}>
                  {minPlan === 'professional' ? 'Pro' : 'Growth'}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px', borderTop: '1px solid #F3F4F6' }}>
        {plan !== 'professional' && (
          <a href="/landing.html#pricing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 14px', borderRadius: 8, background: '#5B7BF8', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
            ⚡ Upgrade Plan
          </a>
        )}
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>🚪</span>
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .mobile-menu-btn { display: none; }
        .desktop-sidebar { display: flex; }
        .mobile-overlay { display: none; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .desktop-sidebar { display: none !important; }
          .mobile-overlay { display: ${open ? 'block' : 'none'} !important; }
          .mobile-sidebar { display: ${open ? 'flex' : 'none'} !important; }
        }
      `}</style>
      <div className="mobile-menu-btn" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'none', alignItems: 'center', padding: '0 16px', zIndex: 50, gap: 12 }}>
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>☰</button>
        <img src="/logo.PNG" alt="Opero" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      </div>
      <div className="mobile-overlay" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <aside className="mobile-sidebar" style={{ display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: '#fff', zIndex: 50, flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", boxShadow: '4px 0 20px rgba(0,0,0,0.1)' }}>
        {sidebarContent}
      </aside>
      <aside className="desktop-sidebar" style={{ width: 220, minHeight: '100vh', background: '#fff', borderRight: '1px solid #E5E7EB', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 40, fontFamily: "'DM Sans', sans-serif" }}>
        {sidebarContent}
      </aside>
    </>
  )
}
