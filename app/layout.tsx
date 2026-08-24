'use client'
import type { Metadata } from 'next'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { normalizeRole, ROLE_SETTINGS, ROLE_MODULES } from '@/lib/useRole'
import { SidebarCollapseProvider, useSidebarCollapse, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/sidebar-context'
import './globals.css'

const PUBLIC_ROUTES = ['/login', '/staff-login', '/reset-password', '/owner-portal', '/pm-owner-portal', '/pm-tenant-portal', '/staff-dashboard']

// Statuses where Stripe has stopped billing successfully — trial expired
// with no working payment method, a renewal failed, or it was cancelled.
// 'cancelled' (double-l) is kept alongside Stripe's real 'canceled' value
// since an earlier version of the webhook wrote the non-standard spelling.
const BLOCKED_STATUSES = ['past_due', 'unpaid', 'incomplete_expired', 'canceled', 'cancelled', 'paused']

// Maps a URL path prefix to the module key ROLE_MODULES is keyed by.
// This is the actual enforcement of "picking a role only unlocks that
// module" — previously ROLE_MODULES was computed but never checked
// against the current path anywhere, so any staff role could reach any
// module just by navigating to its URL directly.
const PATH_MODULE: Record<string, string> = {
  '/str': 'str',
  '/pm': 'pm',
  '/dev': 'dev',
  '/estate': 'ea',
  '/invest': 'invest',
}

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
        .select('role, user_id, custom_modules')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
      const role = normalizeRole(rows?.[0]?.role)
      const customModules = rows?.[0]?.custom_modules?.length ? rows[0].custom_modules : null
      if (role === 'Cleaning Team' || role === 'Maintenance Team') {
        window.location.href = '/staff-dashboard'
        return
      }
      // Belt-and-suspenders: any role not entitled to Settings (per
      // ROLE_SETTINGS) gets bounced from it specifically, even if it's
      // not Cleaning Team/Maintenance Team — those roles still use the
      // rest of the app fine.
      if (pathname?.startsWith('/settings') && !ROLE_SETTINGS[role]) {
        window.location.href = '/'
        return
      }
      // The actual module-access guard: if the current path belongs to
      // a module this role isn't in ROLE_MODULES for, send them to the
      // first module they DO have, rather than leaving a gap where the
      // page just silently rendered anyway.
      const pathPrefix = Object.keys(PATH_MODULE).find(p => pathname?.startsWith(p))
      if (pathPrefix) {
        const requiredModule = PATH_MODULE[pathPrefix]
        const allowedModules = customModules ?? (ROLE_MODULES[role] ?? [])
        if (!allowedModules.includes(requiredModule)) {
          const fallbackModule = allowedModules[0]
          const fallbackPath = fallbackModule ? Object.keys(PATH_MODULE).find(p => PATH_MODULE[p] === fallbackModule) : null
          window.location.href = fallbackPath || '/settings'
          return
        }
      }
      // Staff accounts don't have their own subscription — team_members
      // rows are saved with user_id = the owning account, not the staff
      // member's own auth id. Not being in team_members means this user
      // IS the owner. Either way, this resolves to the account whose
      // billing actually governs access.
      const ownerId = rows?.[0]?.user_id ?? user.id
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', ownerId)
        .single()
      // No subscription row at all is left un-blocked deliberately —
      // that covers accounts set up directly rather than through Stripe
      // checkout, which should never be locked out by this check.
      if (sub && BLOCKED_STATUSES.includes(sub.status) && !pathname?.startsWith('/settings')) {
        window.location.href = '/settings?billing=required'
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
          <SidebarCollapseProvider>
            <LayoutBody>{children}</LayoutBody>
          </SidebarCollapseProvider>
        )}
      </body>
    </html>
  )
}

function LayoutBody({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarCollapse()
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  return (
    <>
      <Sidebar />
      <main className="app-main" style={{ marginLeft: width, flex: 1, minHeight: '100vh', transition: 'margin-left 0.15s ease' }}>
        {children}
      </main>
    </>
  )
}
