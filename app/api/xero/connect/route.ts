import { NextRequest, NextResponse } from 'next/server'

// Kicks off the Xero OAuth2 flow. Hitting /api/xero/connect redirects the
// user to Xero's login/consent screen. After they approve, Xero redirects
// back to /api/xero/callback with a one-time code.

export async function GET(req: NextRequest) {
  const clientId = process.env.XERO_CLIENT_ID
  const redirectUri = process.env.XERO_REDIRECT_URI // e.g. https://helloopero.com/api/xero/callback

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Xero is not configured yet. Set XERO_CLIENT_ID and XERO_REDIRECT_URI.' },
      { status: 500 }
    )
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const scope = [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'offline_access', // required to get a refresh token
  ].join(' ')

  const authUrl = new URL('https://login.xero.com/identity/connect/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', userId) // carry the user id through the round trip

  return NextResponse.redirect(authUrl.toString())
}
