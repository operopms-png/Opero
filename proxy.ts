import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_PATHS: Record<string, string[]> = {
  'Admin':            ['*'],
  'Airbnb Agent':     ['/str'],
  'Property Manager': ['/str', '/pm', '/estate'],
  'Dev':              ['*'],
  'Cleaner':          ['/str/cleaning', '/str/turnovers'],
  'Maintenance':      ['/str/vendors', '/pm/vendors', '/dev/vendors'],
  'Viewer':           ['/str', '/pm', '/dev', '/estate'],
  'Estate Agent':     ['/estate'],
}

const ROLE_SIDEBAR: Record<string, string[]> = {
  'Admin':            ['*'],
  'Airbnb Agent':     ['str'],
  'Property Manager': ['str', 'pm', 'estate'],
  'Dev':              ['*'],
  'Cleaner':          ['str'],
  'Maintenance':      ['str', 'pm', 'dev', 'estate'],
  'Viewer':           ['str', 'pm', 'dev', 'estate'],
  'Estate Agent':     ['estate'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Always allow public paths
  if (
    path === '/login' ||
    path === '/signup' ||
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/public') ||
    path.includes('.')
  ) {
    return res
  }

  // Not logged in — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Check if user is in team_members (invited staff)
  const { data: member } = await supabase
    .from('team_members')
    .select('role, status')
    .eq('email', session.user.email)
    .single()

  // Not in team_members = owner/admin, full access
  if (!member) return res

  // Pending invite — block everything except login
  if (member.status === 'Pending') {
    return NextResponse.redirect(new URL('/login?error=pending', req.url))
  }

  const role = member.role as string
  const allowed = ROLE_PATHS[role] ?? []

  // Full access roles
  if (allowed.includes('*')) return res

  // Check if path is allowed
  const hasAccess = allowed.some(p => path === p || path.startsWith(p + '/'))

  if (!hasAccess) {
    // Redirect to first allowed area
    const first = allowed[0] ?? '/login'
    return NextResponse.redirect(new URL(first, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|opero.html|landing.html).*)'],
}
