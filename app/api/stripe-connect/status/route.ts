export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'
import { stripeAccountReady } from '@/lib/stripe-connect'

// Asks Stripe directly whether the logged-in business's connected account
// can take card payments yet, and saves the result. Settings calls this on
// load, so "Connected" shows as soon as the business returns from Stripe.
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
    const onboarded = await stripeAccountReady(sub.stripe_connect_account_id)
    if (onboarded !== !!sub.stripe_connect_onboarded) {
      await serviceClient.from('subscriptions').update({ stripe_connect_onboarded: onboarded }).eq('user_id', userId)
    }
    return NextResponse.json({ connected: true, onboarded })
  } catch (err: any) {
    console.error('[stripe-connect/status]', err)
    return NextResponse.json({ error: err?.message || 'Could not check Stripe status.' }, { status: 500 })
  }
}
