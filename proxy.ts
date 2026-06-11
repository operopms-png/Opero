import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/properties', '/bookings', '/cleaning', '/maintenance', '/turnovers', '/owners', '/analytics', '/integrations', '/team', '/reports', '/documents', '/guest-comms', '/audit', '/portfolio', '/branding', '/api-access', '/statements']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some(path => pathname.startsWith(path))
  if (!isProtected) return NextResponse.next()

  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/properties/:path*', '/bookings/:path*', '/cleaning/:path*', '/maintenance/:path*', '/turnovers/:path*', '/owners/:path*', '/analytics/:path*', '/integrations/:path*', '/team/:path*', '/reports/:path*', '/documents/:path*', '/guest-comms/:path*', '/audit/:path*'],
}
