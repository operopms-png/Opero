export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// Asks Stripe directly whether the logged-in business's connected account
// has finished onboarding (charges_enabled), and saves the result.
// Settings calls this on load, so "Connected" shows as soon as the business
// returns from Stripe, without relying on the account.updated webhook
// (connected-account events go to a separate Stripe webhook endpoint).
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await serviceClient
    .from('subscriptions')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('user_id', userId)
    .maybeSingle()
  if (!sub?.stripe_connect_account_id) return NextResponse.json({ connected: false, onboarded: false })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
    const account = await stripe.accounts.retrieve(sub.stripe_connect_account_id)
    const onboarded = !!account.charges_enabled
    if (onboarded !== !!sub.stripe_connect_onboarded) {
      await serviceClient.from('subscriptions').update({ stripe_connect_onboarded: onboarded }).eq('user_id', userId)
    }
    return NextResponse.json({ connected: true, onboarded, payouts_enabled: !!account.payouts_enabled, details_submitted: !!account.details_submitted })
  } catch (err: any) {
    console.error('[stripe-connect/status]', err)
    return NextResponse.json({ error: err?.message || 'Could not check Stripe status.' }, { status: 500 })
  }
}
