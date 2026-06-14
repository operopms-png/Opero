import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_PATHS: Record<string, string[]> = {
  'Admin':            ['*'],
  'Airbnb Agent':     ['/str'],
  'Property Manager': ['/str', '/pm', '/estate'],
  'Dev':              ['*'],
  'Cleaner':          ['/str'],
  'Maintenance':      ['/str/vendors', '/pm/vendors', '/dev/vendors'],
  'Viewer':           ['/str', '/pm', '/dev', '/estate'],
  'Estate Agent':     ['/estate'],
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  if (
    path === '/login' ||
    path === '/signup' ||
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.includes('.')
  ) {
    return res
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('role, status')
    .eq('email', session.user.email)
    .single()

  if (!member) return res

  if (member.status === 'Pending') {
    return NextResponse.redirect(new URL('/login?error=pending', req.url))
  }

  const role = member.role as string
  const allowed = ROLE_PATHS[role] ?? []

  if (allowed.includes('*')) return res

  const hasAccess = allowed.some(p => path === p || path.startsWith(p + '/'))

  if (!hasAccess) {
    const first = allowed[0] ?? '/login'
    return NextResponse.redirect(new URL(first, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|opero.html|landing.html).*)'],
}
