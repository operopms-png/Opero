import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// One-time Partners portal membership fee, paid by the investor partner.
// Routes to the managing business's connected Stripe account (same as
// tenant rent), never Opero's platform account. Amount: PARTNER_FEE_GBP
// env var, default £75. The webhook marks owner_profiles.partner_paid_at.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: owner } = await serviceClient
    .from('owner_profiles')
    .select('id, name, email, business_id, partner_paid_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!owner) return NextResponse.json({ error: 'No partner account found for this login' }, { status: 404 })
  if (owner.partner_paid_at) return NextResponse.json({ error: 'Your Partners membership is already paid' }, { status: 400 })
  if (!owner.business_id) return NextResponse.json({ error: 'Your account isn’t linked to a business yet. Please contact the team.' }, { status: 400 })

  const { data: businessSub } = await serviceClient
    .from('subscriptions')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('user_id', owner.business_id)
    .single()
  if (!businessSub?.stripe_connect_account_id || !businessSub.stripe_connect_onboarded) {
    return NextResponse.json({ error: 'Online payments aren’t set up yet. Please contact the team to pay by bank transfer.' }, { status: 400 })
  }

  const feeGbp = parseFloat(process.env.PARTNER_FEE_GBP || '75')
  const amountPence = Math.round(feeGbp * 100)

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Partners portal membership (one-time)' },
          unit_amount: amountPence,
        },
        quantity: 1,
      }],
      metadata: { type: 'partner_fee', owner_id: owner.id },
      ...(owner.email ? { customer_email: owner.email } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/staff-centre/partners?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/staff-centre/partners`,
    }, { stripeAccount: businessSub.stripe_connect_account_id }) // direct charge on the business's own account
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[partner-fee]', err)
    return NextResponse.json({ error: err?.message || 'Could not start checkout.' }, { status: 500 })
  }
}
