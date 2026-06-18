export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 400 })
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return NextResponse.json({
      propertyName: session.metadata?.propertyName || '',
      checkIn: session.metadata?.checkIn || '',
      checkOut: session.metadata?.checkOut || '',
      nights: session.metadata?.nights || '',
      guestName: session.metadata?.guestName || '',
      guestEmail: session.customer_email || '',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
