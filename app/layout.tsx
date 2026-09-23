'use client'
import type { Metadata } from 'next'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { normalizeRole, ROLE_SETTINGS, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { SidebarCollapseProvider, useSidebarCollapse, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/sidebar-context'
import './globals.css'

const PUBLIC_ROUTES = ['/login', '/staff-login', '/reset-password', '/owner-portal', '/pm-owner-portal', '/pm-tenant-portal', '/staff-dashboard']

const BLOCKED_STATUSES = ['past_due', 'unpaid', 'incomplete_expired', 'canceled', 'cancelled', 'paused']

const PATH_MODULE: Record<string, string> = {
  '/str': 'str',
  '/pm': 'pm',
  '/dev': 'dev',
  '/estate': 'ea',
  '/invest': 'invest',
  '/staff-centre': 'sc',
}

const STAFF_CENTRE_PATH_TAB: Record<string, string> = {
  '/staff-centre/inbox': 'inbox',
  '/staff-centre/portals': 'portals',
  '/staff-centre/maintenance': 'maintenance',
  '/staff-centre/crm': 'crm',
  '/staff-centre/marketing': 'marketing',
  '/staff-centre/sales': 'sales',
  '/staff-centre/applications': 'applications',
  '/staff-centre/performance': 'performance',
  '/staff-centre/hr': 'hr',
  '/staff-centre/training': 'training',
  '/staff-centre/calendar': 'calendar',
  '/staff-centre/tasks': 'tasks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
  const [checked, setChecked] = useState(false)

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
      if (pathname?.startsWith('/settings') && !ROLE_SETTINGS[role]) {
        window.location.href = '/'
        return
      }
      const pathPrefix = Object.keys(PATH_MODULE).find(p => pathname?.startsWith(p))
      const allowedModules = customModules ?? (ROLE_MODULES[role] ?? [])
      if (pathPrefix) {
        const requiredModule = PATH_MODULE[pathPrefix]
        if (!allowedModules.includes(requiredModule)) {
          const fallbackModule = allowedModules[0]
          const fallbackPath = fallbackModule ? Object.keys(PATH_MODULE).find(p => PATH_MODULE[p] === fallbackModule) : null
          window.location.href = fallbackPath || '/settings'
          return
        }
      }
      const scPathPrefix = Object.keys(STAFF_CENTRE_PATH_TAB).find(p => pathname?.startsWith(p))
      if (scPathPrefix) {
        const requiredTab = STAFF_CENTRE_PATH_TAB[scPathPrefix]
        const allowedTabs = getScTabs(role, allowedModules)
        if (!allowedTabs.includes(requiredTab)) {
          const firstAllowedPath = Object.keys(STAFF_CENTRE_PATH_TAB).find(p => STAFF_CENTRE_PATH_TAB[p] === allowedTabs[0])
          window.location.href = firstAllowedPath || '/'
          return
        }
      }
      const ownerId = rows?.[0]?.user_id ?? user.id
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', ownerId)
        .single()
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
