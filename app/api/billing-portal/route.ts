export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'

// Opens Stripe's hosted billing page for the logged-in client's own NOVOURQ subscription, so they can update their card,
// see invoices, switch plan or cancel. It uses Novourq's own Stripe account (STRIPE_NOVOURQ_SECRET_KEY) when set.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await serviceClient.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).maybeSingle()
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: 'No billing account found for this login.' }, { status: 404 })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe((process.env.STRIPE_NOVOURQ_SECRET_KEY || process.env.STRIPE_SECRET_KEY)!, { apiVersion: '2026-05-27.dahlia' })
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${SITE_URL}/settings?section=Payments`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing-portal]', err)
    return NextResponse.json({ error: 'Billing page is not switched on yet. Please contact support.' }, { status: 500 })
  }
}
