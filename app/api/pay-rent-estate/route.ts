import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// Same pattern as app/api/pay-rent, adapted to Estate Agency's schema:
// estate_rent_schedules (a recurring schedule row, status Pending/Paid/
// Overdue) instead of PM's per-instance pm_rent_payments. A tenant can
// pay an existing schedule row, or start a new one-off payment if
// they're paying something that was never logged as a pending charge.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { schedule_id, amount, category } = body

  const { data: tenant } = await serviceClient.from('estate_tenants').select('id, name, email, property_id').eq('portal_user_id', userId).single()
  if (!tenant) return NextResponse.json({ error: 'No tenant profile found for this login' }, { status: 404 })

  let schedule: any
  if (schedule_id) {
    const { data } = await serviceClient.from('estate_rent_schedules').select('*').eq('id', schedule_id).eq('tenant_id', tenant.id).single()
    if (!data) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (data.status === 'Paid') return NextResponse.json({ error: 'This payment is already marked paid' }, { status: 400 })
    schedule = data
  } else {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    if (!tenant.property_id) return NextResponse.json({ error: 'No property on file for this tenant' }, { status: 400 })
    const { data: created, error: createError } = await serviceClient.from('estate_rent_schedules').insert({
      tenant_id: tenant.id,
      property_id: tenant.property_id,
      amount: numAmount,
      due_day: new Date().getDate(),
      frequency: 'Monthly',
      method: category || 'Rent',
      status: 'Pending',
    }).select().single()
    if (createError || !created) return NextResponse.json({ error: 'Could not create payment record: ' + (createError?.message || 'unknown error') }, { status: 500 })
    schedule = created
  }

  const { data: property } = await serviceClient.from('estate_properties').select('user_id').eq('id', schedule.property_id).single()
  if (!property) return NextResponse.json({ error: 'Property not found for this payment' }, { status: 404 })

  const { data: businessSub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id, stripe_connect_onboarded').eq('user_id', property.user_id).single()
  if (!businessSub?.stripe_connect_account_id || !businessSub.stripe_connect_onboarded) {
    return NextResponse.json({ error: "Your agency hasn't finished setting up online payments yet. Please pay by bank transfer for now, or contact them directly." }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })

  const amountCents = Math.round((schedule.amount ?? 0) * 100)
  const feePercent = parseFloat(process.env.STRIPE_CONNECT_FEE_PERCENT || '0')
  const applicationFeeAmount = Math.round(amountCents * (feePercent / 100))

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: `${schedule.method || 'Rent'} payment` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: { destination: businessSub.stripe_connect_account_id },
        ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
      },
      metadata: { type: 'estate_tenant_rent_payment', schedule_id: schedule.id, tenant_id: tenant.id },
      ...(tenant.email ? { customer_email: tenant.email } : {}),
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/estate-tenant-portal?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/estate-tenant-portal`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[pay-rent-estate]', err)
    return NextResponse.json({ error: err?.message || 'Could not start checkout.' }, { status: 500 })
  }
}
