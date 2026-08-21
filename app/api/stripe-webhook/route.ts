export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLAN_MAP: Record<string, string> = {
  // Old 3-tier prices (kept for backwards compat)
  'price_1TfeoYGVqeDYuzWEDnDdfTS8': 'starter',
  'price_1TfepHGVqeDYuzWEH6Ugvb8Q': 'growth',
  'price_1TfeplGVqeDYuzWEAcUuLdCB': 'professional',
  'price_1Tfl0kGVqeDYuzWElsWlZLyf': 'starter',
  'price_1Tfl1qGVqeDYuzWEb1htih5S': 'growth',
  'price_1Tfl2AGVqeDYuzWEjAuZlyCI': 'professional',
  // New 6-module prices (live)
  'price_1TnhJFGa2COshwfZ4gPTqI5U': 'aipm',
  'price_1TnhKSGa2COshwfZ2htSNZgt': 'invest',
  'price_1TnhL3Ga2COshwfZw7qLRJt2': 'str',
  'price_1TnhLWGa2COshwfZE1YImFSK': 'pm',
  'price_1TnhM2Ga2COshwfZSViH7HsG': 'dev',
  'price_1TnhMYGa2COshwfZVkT5DQGt': 'ea',
  'price_1TnhN2Ga2COshwfZPkq6XNA7': 'bundle',
}

const YEARLY_IDS = [
  'price_1Tfl0kGVqeDYuzWElsWlZLyf',
  'price_1Tfl1qGVqeDYuzWEb1htih5S',
  'price_1Tfl2AGVqeDYuzWEjAuZlyCI',
]

const ALL_MODULES = ['aipm', 'invest', 'str', 'pm', 'dev', 'ea']

export async function POST(request: NextRequest) {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object as any

      // Tenant rent/utility payment — handled entirely separately from
      // the module-subscription flow below. A tenant's checkout email is
      // their tenant-portal login, not a business account, and must
      // never touch the subscriptions table.
      if (session.metadata?.type === 'tenant_rent_payment') {
        const paymentId = session.metadata.payment_id
        if (paymentId) {
          await supabase.from('pm_rent_payments').update({
            status: 'paid',
            paid_date: new Date().toISOString().slice(0, 10),
            method: 'card',
          }).eq('id', paymentId)
        }
        return NextResponse.json({ received: true })
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })
      const email = fullSession.customer_details?.email ?? fullSession.customer_email
      const priceId = fullSession.line_items?.data?.[0]?.price?.id ?? ''
      const plan = PLAN_MAP[priceId] ?? 'starter'
      const billingPeriod = YEARLY_IDS.includes(priceId) ? 'yearly' : 'monthly'
      const isOneTime = fullSession.mode === 'payment'
      await supabase.from('webhook_debug_log').insert({ step: 'session_parsed', detail: { email, priceId, plan, isOneTime, sessionId: fullSession.id } })
      if (email) {
        const { data: users, error: listError } = await supabase.auth.admin.listUsers()
        await supabase.from('webhook_debug_log').insert({ step: 'list_users', detail: { userCount: users?.users?.length ?? null, listError: listError?.message ?? null } })
        const user = users?.users?.find((u) => u.email === email)
        await supabase.from('webhook_debug_log').insert({ step: 'user_match', detail: { matchedUserId: user?.id ?? null, searchedEmail: email } })
        if (user) {
          const { data: existing } = await supabase.from('subscriptions').select('modules').eq('user_id', user.id).single()
          const existingModules: string[] = (existing as any)?.modules ?? []
          const newModules = plan === 'bundle' ? ALL_MODULES : Array.from(new Set([...existingModules, plan]))
          if (isOneTime) {
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
              user_id: user.id, plan, billing_period: billingPeriod, status: 'active',
              modules: newModules,
              stripe_customer_id: fullSession.customer as string,
              stripe_subscription_id: null,
              trial_end: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            await supabase.from('webhook_debug_log').insert({ step: 'upsert_onetime', detail: { upsertError: upsertError?.message ?? null } })
          } else {
            let trialEnd: string | null = null
            if (fullSession.subscription) {
              const stripeSub = await stripe.subscriptions.retrieve(fullSession.subscription as string)
              trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null
            }
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
              user_id: user.id, plan, billing_period: billingPeriod, status: 'trialing',
              modules: newModules,
              stripe_customer_id: fullSession.customer as string,
              stripe_subscription_id: fullSession.subscription as string,
              trial_end: trialEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            await supabase.from('webhook_debug_log').insert({ step: 'upsert_subscription', detail: { upsertError: upsertError?.message ?? null } })
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase.from('webhook_debug_log').insert({ step: 'exception', detail: { message } })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as any
    const priceId = sub.items.data[0]?.price?.id ?? ''
    const plan = PLAN_MAP[priceId] ?? 'starter'
    const billingPeriod = YEARLY_IDS.includes(priceId) ? 'yearly' : 'monthly'
    await supabase.from('subscriptions').update({
      plan, billing_period: billingPeriod, status: sub.status,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any
    await supabase.from('subscriptions').update({
      status: 'canceled', updated_at: new Date().toISOString(),
    }).eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
