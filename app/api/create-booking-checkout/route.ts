export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
    const { propertyId, propertyName, checkIn, checkOut, nights, total, guestName, guestEmail, guestPhone } = await request.json()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: guestEmail,
      line_items: [{ price_data: { currency: 'gbp', product_data: { name: `${propertyName} — ${nights} night${nights > 1 ? 's' : ''}`, description: `Check-in: ${checkIn} · Check-out: ${checkOut}` }, unit_amount: Math.round(total * 100) }, quantity: 1 }],
      metadata: { propertyId, checkIn, checkOut, guestName, guestEmail, guestPhone, nights: String(nights) },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/${propertyId}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
