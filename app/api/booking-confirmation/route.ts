export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getStripe } from '@/lib/stripe-connect'

// Booking summary for /book/success. Direct bookings are charged on the
// host business's own Stripe account, so the session is read from that
// account (found from the property, ?p=<property id>).
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    const propertyId = request.nextUrl.searchParams.get('p')
    if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 400 })

    let stripeAccount: string | undefined
    if (propertyId) {
      const { data: property } = await serviceClient.from('properties').select('user_id').eq('id', propertyId).maybeSingle()
      if (property?.user_id) {
        const { data: sub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id').eq('user_id', property.user_id).maybeSingle()
        stripeAccount = sub?.stripe_connect_account_id ?? undefined
      }
    }

    const stripe = await getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {}, stripeAccount ? { stripeAccount } : undefined)
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
