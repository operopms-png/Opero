export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getStripe } from '@/lib/stripe-connect'
import { activatePartnerSignup } from '@/lib/partner-activation'

// Used by /join/success to know when the new partner's account is active.
// If the webhook hasn't arrived yet, asks Stripe directly (the payment is a
// direct charge on the business's own account) and activates if it's paid.
// Returns only a status and the email to prefill the sign-in form.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 })
  const { data } = await serviceClient
    .from('partner_signups')
    .select('id, status, email, business_id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()
  if (!data) return NextResponse.json({ status: 'unknown' })
  if (data.status === 'paid') return NextResponse.json({ status: 'paid', email: data.email })

  try {
    const { data: sub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id').eq('user_id', data.business_id).maybeSingle()
    if (sub?.stripe_connect_account_id) {
      const stripe = await getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: sub.stripe_connect_account_id })
      if (session.payment_status === 'paid' && session.metadata?.signup_id === data.id) {
        await activatePartnerSignup(data.id, (session.payment_intent as string) ?? session.id)
        return NextResponse.json({ status: 'paid', email: data.email })
      }
    }
  } catch (err) {
    console.error('[partner-join/status]', err)
  }
  return NextResponse.json({ status: data.status, email: data.email })
}
