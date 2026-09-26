export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { businessStripeAccount, getStripe } from '@/lib/stripe-connect'

// Direct booking checkout for the public /book/[slug] page.
// Everything that decides the price is worked out HERE from the database —
// the guest's browser only sends the property and dates. Previously the
// browser sent the total, so a guest could change it and pay any amount.
// Also refuses dates that overlap an existing booking.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_NIGHTS = 90

export async function POST(request: NextRequest) {
  try {
    const { propertyId, checkIn, checkOut, guestName, guestEmail, guestPhone } = await request.json()

    if (!propertyId || !DATE_RE.test(checkIn ?? '') || !DATE_RE.test(checkOut ?? '')) {
      return NextResponse.json({ error: 'Please choose valid dates.' }, { status: 400 })
    }
    if (!guestName || !guestEmail || !guestPhone) {
      return NextResponse.json({ error: 'Please fill in your name, email and phone.' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (checkIn < today) return NextResponse.json({ error: 'Check-in can’t be in the past.' }, { status: 400 })
    const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    if (!(nights >= 1)) return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    if (nights > MAX_NIGHTS) return NextResponse.json({ error: `Bookings are limited to ${MAX_NIGHTS} nights online. Please contact us for longer stays.` }, { status: 400 })

    const { data: property } = await serviceClient
      .from('properties')
      .select('id, name, slug, user_id, nightly_rate, cleaning_fee, is_bookable')
      .eq('id', propertyId)
      .maybeSingle()
    if (!property || !property.slug || property.is_bookable === false) {
      return NextResponse.json({ error: 'This property isn’t available for online booking.' }, { status: 404 })
    }
    const nightly = Number(property.nightly_rate) || 0
    const cleaning = Number(property.cleaning_fee) || 0
    if (nightly <= 0) return NextResponse.json({ error: 'This property has no nightly rate set yet.' }, { status: 400 })

    // Overlap with a confirmed direct booking or a synced Airbnb/Booking.com booking
    const [{ data: direct }, { data: synced }] = await Promise.all([
      serviceClient.from('direct_bookings').select('id').eq('property_id', property.id).eq('status', 'confirmed').lt('check_in', checkOut).gt('check_out', checkIn).limit(1),
      serviceClient.from('bookings').select('id').eq('property_id', property.id).neq('status', 'cancelled').lt('check_in', checkOut).gt('check_out', checkIn).limit(1),
    ])
    if ((direct?.length ?? 0) > 0 || (synced?.length ?? 0) > 0) {
      return NextResponse.json({ error: 'Sorry, some of those dates have just been booked. Please pick different dates.' }, { status: 409 })
    }

    const total = nights * nightly + cleaning
    const amountPence = Math.round(total * 100)

    // Guest pays the business that owns the property, as a direct charge on
    // its own connected Stripe account. Never Opero's account.
    const account = await businessStripeAccount(property.user_id)
    if (!account) {
      return NextResponse.json({ error: 'Online booking payments aren’t set up for this property yet. Please contact the host to book.' }, { status: 400 })
    }

    const stripe = await getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: guestEmail,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${property.name} — ${nights} night${nights > 1 ? 's' : ''}`,
            description: `Check-in: ${checkIn} · Check-out: ${checkOut}`,
          },
          unit_amount: amountPence,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'direct_booking',
        propertyId: property.id,
        propertyName: property.name,
        checkIn,
        checkOut,
        nights: String(nights),
        nightlyRate: String(nightly),
        cleaningFee: String(cleaning),
        total: String(total),
        guestName,
        guestEmail,
        guestPhone,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/success?session_id={CHECKOUT_SESSION_ID}&p=${property.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/${property.slug}`,
    }, { stripeAccount: account })
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
