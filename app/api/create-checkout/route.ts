import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

const PRICE_IDS: Record<string, string> = {
  starter: 'price_1TfeoYGVqeDYuzWEDnDdfTS8',
  growth: 'price_1TfepHGVqeDYuzWEH6Ugvb8Q',
  professional: 'price_1TfeplGVqeDYuzWEAcUuLdCB',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, priceId } = body
    const finalPriceId = priceId || PRICE_IDS[plan]

    if (!finalPriceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/login?plan=${plan}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/landing.html#pricing`,
      allow_promotion_codes: true,
    })

    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items'],
    })
    return NextResponse.json({ url: fullSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
