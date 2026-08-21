import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// Creates a one-time Stripe Checkout session for a tenant to pay a specific
// outstanding rent/utility charge. Verifies the payment row actually
// belongs to the logged-in tenant before creating the session, so a
// tenant can't pay (or be charged for) someone else's record.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { payment_id } = await req.json()
  if (!payment_id) return NextResponse.json({ error: 'payment_id is required' }, { status: 400 })

  const { data: tenant } = await serviceClient.from('pm_tenants').select('id, name, email').eq('portal_user_id', userId).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant profile found for this login' }, { status: 404 })

  const { data: payment } = await serviceClient.from('pm_rent_payments').select('*').eq('id', payment_id).eq('tenant_id', tenant.id).single()
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  if (payment.status === 'paid') return NextResponse.json({ error: 'This payment is already marked paid' }, { status: 400 })

  // Find the business that manages this property, so the payment routes
  // to THEIR bank account (via their connected Stripe account), not
  // Opero's own platform account.
  const { data: property } = await serviceClient.from('pm_properties').select('user_id').eq('id', payment.property_id).single()
  if (!property) return NextResponse.json({ error: 'Property not found for this payment' }, { status: 404 })

  const { data: businessSub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id, stripe_connect_onboarded').eq('user_id', property.user_id).single()
  if (!businessSub?.stripe_connect_account_id || !businessSub.stripe_connect_onboarded) {
    return NextResponse.json({ error: "Your property manager hasn't finished setting up online payments yet. Please pay by bank transfer for now, or contact them directly." }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })

  const amountCents = Math.round((payment.amount ?? 0) * 100)
  // Optional platform fee, off by default. Set STRIPE_CONNECT_FEE_PERCENT
  // (e.g. "1.5") in env vars if Opero should take a cut of tenant payments.
  const feePercent = parseFloat(process.env.STRIPE_CONNECT_FEE_PERCENT || '0')
  const applicationFeeAmount = Math.round(amountCents * (feePercent / 100))

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: `${payment.category} payment${payment.due_date ? ` — due ${payment.due_date}` : ''}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: { destination: businessSub.stripe_connect_account_id },
        ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
      },
      metadata: { type: 'tenant_rent_payment', payment_id: payment.id, tenant_id: tenant.id },
      ...(tenant.email ? { customer_email: tenant.email } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pm-tenant-portal?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pm-tenant-portal`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[pay-rent]', err)
    return NextResponse.json({ error: err?.message || 'Could not start checkout.' }, { status: 500 })
  }
}
