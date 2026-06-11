import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/properties', '/bookings', '/cleaning', '/maintenance', '/turnovers', '/owners', '/analytics', '/integrations', '/team', '/reports', '/documents', '/guest-comms', '/audit']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some(path => pathname.startsWith(path))
  if (!isProtected) return NextResponse.next()

  const cookies = request.cookies.getAll()
  const cookieNames = cookies.map(c => c.name)
  
  // Allow through if ANY cookie exists that looks like a session
  const hasSession = cookieNames.some(name => 
    name.includes('sb-') ||
    name.includes('supabase') ||
    name.includes('session') ||
    name.includes('token') ||
    name.includes('auth')
  )

  // Add cookie debug header
  const response = NextResponse.next()
  response.headers.set('x-cookies', cookieNames.join(',').slice(0, 200))

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/properties/:path*', '/bookings/:path*', '/cleaning/:path*', '/maintenance/:path*', '/turnovers/:path*', '/owners/:path*', '/analytics/:path*', '/integrations/:path*', '/team/:path*', '/reports/:path*', '/documents/:path*', '/guest-comms/:path*', '/audit/:path*'],
}
