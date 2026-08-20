import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Xero redirects back here after the user approves the connection.
// We exchange the one-time `code` for an access token + refresh token,
// find out which Xero organisation ("tenant") they picked, and save it all.

export async function GET(req: NextRequest) {
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
  const redirectUri = process.env.XERO_REDIRECT_URI

  const code = req.nextUrl.searchParams.get('code')
  const userId = req.nextUrl.searchParams.get('state') // we passed userId as `state` earlier
  const error = req.nextUrl.searchParams.get('error')

  const appUrl = new URL('/integrations', 'https://helloopero.com')

  if (error) {
    appUrl.searchParams.set('xero_error', error)
    return NextResponse.redirect(appUrl.toString())
  }

  if (!code || !userId || !clientId || !clientSecret || !redirectUri) {
    appUrl.searchParams.set('xero_error', 'missing_params')
    return NextResponse.redirect(appUrl.toString())
  }

  try {
    // Step 1: exchange the code for tokens
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) throw new Error('Token exchange failed')
    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Step 2: find which Xero organisation (tenant) was connected
    const connRes = await fetch('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const connections = await connRes.json()
    const tenant = connections?.[0]

    // Step 3: save everything against this user
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    const { error: dbError } = await supabase.from('integrations').upsert(
      {
        user_id: userId,
        xero_access_token: access_token,
        xero_refresh_token: refresh_token,
        xero_tenant_id: tenant?.tenantId ?? null,
        xero_tenant_name: tenant?.tenantName ?? null,
        xero_token_expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    )

    if (dbError) throw dbError

    appUrl.searchParams.set('xero_connected', '1')
    return NextResponse.redirect(appUrl.toString())
  } catch (e) {
    appUrl.searchParams.set('xero_error', 'connect_failed')
    return NextResponse.redirect(appUrl.toString())
  }
}
