import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

const PRICE_IDS = {
  starter: 'price_1TfeoYGVqeDYuzWEDnDdfTS8',
  growth: 'price_1TfepHGVqeDYuzWEH6Ugvb8Q',
  professional: 'price_1TfeplGVqeDYuzWEAcUuLdCB',
}

export async function POST(request: NextRequest) {
  try {
    const { plan, priceId } = await request.json()
    const finalPriceId = priceId || PRICE_IDS[plan as keyof typeof PRICE_IDS]

    if (!finalPriceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/login?plan=${plan}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/landing.html#pricing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err.message, 'priceId:', finalPriceId)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
