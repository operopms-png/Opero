'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/properties', icon: '🏠', label: 'Properties' },
  { href: '/bookings', icon: '📅', label: 'Bookings' },
  { href: '/cleaning', icon: '🧹', label: 'Cleaning' },
  { href: '/turnovers', icon: '🔄', label: 'Turnovers' },
  { href: '/maintenance', icon: '🔧', label: 'Maintenance' },
  { href: '/reports', icon: '📊', label: 'Reports' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 40, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#111827', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14 }}>O</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Opero</span>
        </div>
      </div>
      <nav style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, background: active ? '#111827' : 'transparent', color: active ? '#fff' : '#6B7280' }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}