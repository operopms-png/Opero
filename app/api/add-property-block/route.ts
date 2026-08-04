export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Which subscriptions column tracks extra blocks for each scalable module.
const BLOCK_COLUMN: Record<string, string> = {
  str: 'str_extra_blocks',
  pm: 'pm_extra_blocks',
  ea: 'ea_extra_blocks',
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, module } = await req.json()
    if (!user_id || !module || !BLOCK_COLUMN[module]) {
      return NextResponse.json({ error: 'Invalid user_id or module' }, { status: 400 })
    }
    const column = BLOCK_COLUMN[module]

    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, str_extra_blocks, pm_extra_blocks, ea_extra_blocks')
      .eq('user_id', user_id)
      .single()

    if (subError || !sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    if (!sub.stripe_subscription_id) return NextResponse.json({ error: 'No active Stripe subscription on file' }, { status: 400 })

    const extraPropertyPriceId = process.env.STRIPE_PRICE_EXTRA_PROPERTY_BLOCK
    if (!extraPropertyPriceId) {
      return NextResponse.json({ error: 'Extra property billing is not configured yet (missing STRIPE_PRICE_EXTRA_PROPERTY_BLOCK)' }, { status: 500 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })

    // Add (or bump quantity on) a subscription item for this add-on price,
    // billed with proration on the customer's existing subscription —
    // no separate checkout needed since they're already a paying customer.
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const existingItem = stripeSub.items.data.find((it) => it.price.id === extraPropertyPriceId)

    if (existingItem) {
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity: (existingItem.quantity ?? 0) + 1,
        proration_behavior: 'create_prorations',
      })
    } else {
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: extraPropertyPriceId,
        quantity: 1,
        proration_behavior: 'create_prorations',
      })
    }

    const newCount = ((sub as any)[column] ?? 0) + 1
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ [column]: newCount, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true, extraBlocks: newCount })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
