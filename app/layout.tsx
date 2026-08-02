'use client'
import type { Metadata } from 'next'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { normalizeRole, ROLE_SETTINGS } from '@/lib/useRole'
import './globals.css'

const PUBLIC_ROUTES = ['/login', '/staff-login', '/reset-password', '/owner-portal', '/pm-owner-portal', '/staff-dashboard']

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
  const [checked, setChecked] = useState(false)

  // Runs on every protected page load (not just at login) — catches
  // Cleaner/Maintenance staff who land here via an existing session,
  // a bookmark, or direct URL, not just a fresh sign-in.
  useEffect(() => {
    if (isPublicRoute) { setChecked(true); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecked(true); return }
      const { data: rows } = await supabase
        .from('team_members')
        .select('role')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
      const role = normalizeRole(rows?.[0]?.role)
      if (role === 'Cleaner' || role === 'Maintenance') {
        window.location.href = '/staff-dashboard'
        return
      }
      // Belt-and-suspenders: any role not entitled to Settings (per
      // ROLE_SETTINGS) gets bounced from it specifically, even if it's
      // not Cleaner/Maintenance (e.g. Airbnb Agent, Property Manager,
      // Estate Agent) — those roles still use the rest of the app fine.
      if (pathname?.startsWith('/settings') && !ROLE_SETTINGS[role]) {
        window.location.href = '/'
        return
      }
      setChecked(true)
    })
  }, [pathname, isPublicRoute])

  return (
    <html lang="en">
      <head>
        <title>Opero — Vacation Rental Operations</title>
        <meta name="description" content="Operations platform for vacation rental managers" />
      </head>
      <body style={{ margin: 0, background: '#F7F8FA', display: 'flex' }}>
        {isPublicRoute ? (
          <main style={{ flex: 1, minHeight: '100vh' }}>
            {children}
          </main>
        ) : !checked ? (
          <main style={{ flex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3' }}>Loading...</main>
        ) : (
          <>
            <Sidebar />
            <main className="app-main" style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
              {children}
            </main>
          </>
        )}
      </body>
    </html>
  )
}
