'use client'
import type { Metadata } from 'next'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { resolveAccess, ROLE_SETTINGS, ROLE_MODULES, getScTabs } from '@/lib/useRole'
import { SidebarCollapseProvider, useSidebarCollapse, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/sidebar-context'
import './globals.css'

const PUBLIC_ROUTES = ['/login', '/staff-login', '/reset-password', '/owner-portal', '/pm-owner-portal', '/pm-tenant-portal', '/staff-dashboard', '/meet']

// Statuses where Stripe has stopped billing successfully — trial expired
// with no working payment method, a renewal failed, or it was cancelled.
// 'cancelled' (double-l) is kept alongside Stripe's real 'canceled' value
// since an earlier version of the webhook wrote the non-standard spelling.
const BLOCKED_STATUSES = ['past_due', 'unpaid', 'incomplete_expired', 'canceled', 'cancelled', 'paused']

const PATH_MODULE: Record<string, string> = {
  '/str': 'str',
  '/pm': 'pm',
  '/dev': 'dev',
  '/estate': 'ea',
  '/invest': 'invest',
  '/staff-centre': 'sc',
  '/partners': 'sc',
}

const STAFF_CENTRE_PATH_TAB: Record<string, string> = {
  '/staff-centre/oversight': 'oversight',
  '/staff-centre/partners': 'partners',
  '/partners': 'partners',
  '/staff-centre/investors': 'investors',
  '/staff-centre/customer-onboarding': 'customeronboarding',
  '/staff-centre/portal-access': 'portalaccess',
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
  '/staff-centre/meetings': 'meetings',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isPublicRoute) { setChecked(true); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecked(true); return }
      const access = await resolveAccess(user)
      const role = access.role
      const customModules = access.customModules
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
      // Partners (investors) only reach the pages an admin has granted them;
      // anything else (dashboard, settings, unlisted pages) goes to Partners.
      if (role === 'Partner' && !pathPrefix) {
        window.location.href = '/staff-centre/partners'
        return
      }
      if (pathPrefix) {
        const requiredModule = PATH_MODULE[pathPrefix]
        if (!allowedModules.includes(requiredModule)) {
          const fallbackModule = allowedModules[0]
          const fallbackPath = role === 'Partner'
            ? '/staff-centre/partners'
            : fallbackModule ? Object.keys(PATH_MODULE).find(p => PATH_MODULE[p] === fallbackModule) : null
          window.location.href = fallbackPath || '/settings'
          return
        }
      }
      const scPathPrefix = Object.keys(STAFF_CENTRE_PATH_TAB).find(p => pathname?.startsWith(p))
      if (role === 'Partner' && pathPrefix && PATH_MODULE[pathPrefix] === 'sc' && !scPathPrefix) {
        window.location.href = '/staff-centre/partners'
        return
      }
      if (scPathPrefix) {
        const requiredTab = STAFF_CENTRE_PATH_TAB[scPathPrefix]
        const allowedTabs = getScTabs(role, allowedModules)
        if (!allowedTabs.includes(requiredTab)) {
          const firstAllowedPath = Object.keys(STAFF_CENTRE_PATH_TAB).find(p => STAFF_CENTRE_PATH_TAB[p] === allowedTabs[0])
          window.location.href = firstAllowedPath || '/'
          return
        }
      }
      const ownerId = access.businessId
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', ownerId)
        .single()
      if (role !== 'Partner' && sub && BLOCKED_STATUSES.includes(sub.status) && !pathname?.startsWith('/settings')) {
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
