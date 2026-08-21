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

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: { name: `${payment.category} payment${payment.due_date ? ` — due ${payment.due_date}` : ''}` },
        unit_amount: Math.round((payment.amount ?? 0) * 100),
      },
      quantity: 1,
    }],
    metadata: { type: 'tenant_rent_payment', payment_id: payment.id, tenant_id: tenant.id },
    ...(tenant.email ? { customer_email: tenant.email } : {}),
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pm-tenant-portal?paid=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pm-tenant-portal`,
  })

  return NextResponse.json({ url: session.url })
}
