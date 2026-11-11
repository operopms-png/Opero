export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Adds ONE extra property (£12 a month) to the client's NOVOURQ subscription. Every client gets 3 properties included.
// The price lives in Stripe (Novourq's account) as STRIPE_PRICE_NOVOURQ_EXTRA_PROPERTY, a £12 monthly price with quantity.
// The quantity on the subscription is the number of extras; the webhook keeps subscriptions.extra_properties in step.
export async function POST(req: NextRequest) {
  try {
    const caller = await getCaller(req)
    if (!caller) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const { user_id } = await req.json()
    if (!caller.isAdmin || user_id !== caller.businessId) return NextResponse.json({ error: 'Only an admin of this business can add more properties.' }, { status: 403 })

    const { data: sub } = await supabase.from('subscriptions').select('stripe_subscription_id, billing_period, extra_properties').eq('user_id', user_id).maybeSingle()
    if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    if (sub.billing_period === 'lifetime' || !sub.stripe_subscription_id) {
      return NextResponse.json({ error: 'Extra properties on a Lifetime plan are added by our team. Please contact support and we will set it up.' }, { status: 400 })
    }
    const priceId = process.env.STRIPE_PRICE_NOVOURQ_EXTRA_PROPERTY
    if (!priceId) return NextResponse.json({ error: 'Extra property billing is not switched on yet. Please contact support.' }, { status: 500 })

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe((process.env.STRIPE_NOVOURQ_SECRET_KEY || process.env.STRIPE_SECRET_KEY)!, { apiVersion: '2026-05-27.dahlia' })
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const item = stripeSub.items.data.find(it => it.price.id === priceId)
    let quantity: number
    if (item) {
      quantity = (item.quantity ?? 0) + 1
      await stripe.subscriptionItems.update(item.id, { quantity, proration_behavior: 'create_prorations' })
    } else {
      quantity = 1
      await stripe.subscriptionItems.create({ subscription: sub.stripe_subscription_id, price: priceId, quantity, proration_behavior: 'create_prorations' })
    }
    // Allow the new property straight away; the webhook confirms the same number.
    const { error } = await supabase.from('subscriptions').update({ extra_properties: quantity, updated_at: new Date().toISOString() }).eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, extra: quantity })
  } catch (err: unknown) {
    console.error('[add-property-block]', err)
    return NextResponse.json({ error: 'Could not add the property to your plan. Please try again or contact support.' }, { status: 500 })
  }
}
