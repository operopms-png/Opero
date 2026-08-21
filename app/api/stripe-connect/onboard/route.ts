import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// Starts (or resumes) Stripe Connect Express onboarding for the logged-in
// business, so tenant payments can route to their own bank account instead
// of Opero's platform Stripe account. Returns a one-time onboarding URL to
// redirect the user to.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe is not configured on the server' }, { status: 500 })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })

    const { data: sub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id').eq('user_id', userId).single()

    let accountId = sub?.stripe_connect_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' })
      accountId = account.id
      const { error } = await serviceClient.from('subscriptions').update({ stripe_connect_account_id: accountId }).eq('user_id', userId)
      if (error) return NextResponse.json({ error: 'Failed to save connected account: ' + error.message }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/settings?stripe_connect=refresh`,
      return_url: `${siteUrl}/settings?stripe_connect=return`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    // Most common real-world cause: Stripe Connect isn't enabled yet on
    // this platform account (Stripe Dashboard > Connect > get started),
    // which makes accounts.create throw. Surface the real Stripe message
    // instead of a bare 500 with an HTML error page.
    console.error('[stripe-connect/onboard]', err)
    return NextResponse.json({ error: err?.message || 'Stripe Connect setup failed.' }, { status: 500 })
  }
}
