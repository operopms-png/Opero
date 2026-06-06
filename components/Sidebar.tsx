'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NAV = [
  { href: '/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/properties', icon: '🏠', label: 'Properties' },
  { href: '/bookings', icon: '📅', label: 'Bookings' },
  { href: '/cleaning', icon: '🧹', label: 'Cleaning' },
  { href: '/turnovers', icon: '🔄', label: 'Turnovers' },
  { href: '/maintenance', icon: '🔧', label: 'Maintenance' },
  { href: '/analytics', icon: '📈', label: 'Analytics' },
  { href: '/reports', icon: '📊', label: 'Reports' },
  { href: '/owners', icon: '👥', label: 'Owner Reports' },
  { href: '/integrations', icon: '🔗', label: 'Integrations' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/landing.html'
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.png" alt="Opero" style={{ width: 50, height: 50, objectFit: 'contain' }} />
        <button onClick={() => setOpen(false)} style={{ display: 'none', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }} className="mobile-close">✕</button>
      </div>
      <nav style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, background: active ? '#2563EB' : 'transparent', color: active ? '#fff' : '#6B7280' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px', borderTop: '1px solid #F3F4F6' }}>
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
          .main-content { margin-left: 0 !important; }
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="mobile-menu-btn" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'none', alignItems: 'center', padding: '0 16px', zIndex: 50, gap: 12 }}>
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>☰</button>
        <img src="/logo.png" alt="Opero" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      </div>

      {/* Mobile overlay */}
      <div className="mobile-overlay" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />

      {/* Mobile sidebar */}
      <aside className="mobile-sidebar" style={{ display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: '#fff', zIndex: 50, flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", boxShadow: '4px 0 20px rgba(0,0,0,0.1)' }}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{ width: 220, minHeight: '100vh', background: '#fff', borderRight: '1px solid #E5E7EB', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 40, fontFamily: "'DM Sans', sans-serif" }}>
        {sidebarContent}
      </aside>
    </>
  )
}