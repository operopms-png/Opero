export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'

// Used by /join/success to know when the webhook has activated the account.
// Returns only a status and the email to prefill the sign-in form.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 })
  const { data } = await serviceClient
    .from('partner_signups')
    .select('status, email')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()
  if (!data) return NextResponse.json({ status: 'unknown' })
  return NextResponse.json({ status: data.status, email: data.email })
}
