export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// Opero now sells one thing: all-modules access, either £79/mo or £175.50
// one-time -- the old per-module à la carte prices (aipm/invest/str/pm/
// dev/ea) are no longer offered for new signups.
const PRICE_IDS: Record<string, string> = {
  monthly: 'price_1UICnBGa2COshwfZYzSdr6V3',
  onetime: 'price_1TnhN2Ga2COshwfZPkq6XNA7',
}

export async function POST(request: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
    const body = await request.json()
    const { plan, priceId, email, returnTo } = body
    const finalPriceId = priceId || PRICE_IDS[plan]
    if (!finalPriceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    const isOneTime = plan === 'onetime'
    const successPath = returnTo || `/login?plan=${plan}&success=true`
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      ...(isOneTime ? {} : { subscription_data: { trial_period_days: 14 } }),
      // Prefilling this ties the payment reliably to the right account —
      // without it, Stripe just asks for an email fresh at checkout, and a
      // typo or different email there means the webhook can't match it to
      // any existing user.
      ...(email ? { customer_email: email } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}${successPath}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/landing.html#pricing`,
      allow_promotion_codes: true,
    })
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })
    return NextResponse.json({ url: fullSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
