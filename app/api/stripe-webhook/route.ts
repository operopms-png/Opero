export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { activatePartnerSignup } from '@/lib/partner-activation'

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
  // Current all-modules pricing (monthly £79 / one-time £175.50) -- both
  // grant the same full module set, so both map to 'bundle'.
  'price_1UICnBGa2COshwfZYzSdr6V3': 'bundle',
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

  // Customer payments are direct charges on each business's connected
  // account, so their checkout.session.completed events come from a separate
  // "Connected accounts" webhook endpoint with its own signing secret
  // (STRIPE_CONNECT_WEBHOOK_SECRET). Accept either secret.
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    try {
      if (!connectSecret) throw err
      event = stripe.webhooks.constructEvent(body, sig, connectSecret)
    } catch {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
    }
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

      // Investor partner paying the one-time Partners portal fee.
      // Like tenant payments, this never touches the subscriptions table.
      if (session.metadata?.type === 'partner_fee') {
        const ownerId = session.metadata.owner_id
        if (ownerId) {
          await supabase.from('owner_profiles').update({
            partner_paid_at: new Date().toISOString(),
            partner_payment_ref: (session.payment_intent as string) ?? session.id,
          }).eq('id', ownerId)
        }
        return NextResponse.json({ received: true })
      }

      // New partner paying the one-time fee from /join/<slug>: activate the
      // login created at sign-up and create their partner record, marked paid.
      // Safe to run twice (Stripe can resend events).
      if (session.metadata?.type === 'partner_join') {
        if (session.payment_status === 'paid' && session.metadata.signup_id) {
          await activatePartnerSignup(session.metadata.signup_id, (session.payment_intent as string) ?? session.id)
        }
        return NextResponse.json({ received: true })
      }

      // Guest paying for a direct booking from /book/[slug]. Record it so the
      // dates are blocked on the booking calendar and it shows in bookings.
      // Stripe can resend events, so skip if this session is already saved.
      if (session.metadata?.type === 'direct_booking') {
        const m = session.metadata
        const { data: existingBooking } = await supabase.from('direct_bookings').select('id').eq('stripe_session_id', session.id).maybeSingle()
        if (!existingBooking) {
          await supabase.from('direct_bookings').insert({
            property_id: m.propertyId,
            guest_name: m.guestName,
            guest_email: m.guestEmail || session.customer_email,
            guest_phone: m.guestPhone,
            check_in: m.checkIn,
            check_out: m.checkOut,
            nights: Number(m.nights) || null,
            nightly_rate: Number(m.nightlyRate) || null,
            cleaning_fee: Number(m.cleaningFee) || 0,
            total: Number(m.total) || (session.amount_total ? session.amount_total / 100 : null),
            status: 'confirmed',
            stripe_session_id: session.id,
          })
        }
        return NextResponse.json({ received: true })
      }

      // Same as above, for Estate Agency tenants paying via
      // estate_rent_schedules instead of pm_rent_payments.
      if (session.metadata?.type === 'estate_tenant_rent_payment') {
        const scheduleId = session.metadata.schedule_id
        if (scheduleId) {
          await supabase.from('estate_rent_schedules').update({
            status: 'Paid',
            method: 'card',
          }).eq('id', scheduleId)
        }
        return NextResponse.json({ received: true })
      }

      // Anything else from a business's connected account is that business's
      // own sale, never an Opero subscription.
      if ((event as any).account) return NextResponse.json({ received: true })

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

  // Fires when a connected account's details change during/after Stripe
  // Connect onboarding. Arrives from a "Connected accounts" webhook endpoint
  // (its secret in STRIPE_CONNECT_WEBHOOK_SECRET). Optional: Settings also
  // checks Stripe directly via /api/stripe-connect/status. charges_enabled
  // flipping to true is what means onboarding is complete.
  if (event.type === 'account.updated') {
    const account = event.data.object as any
    await supabase.from('subscriptions').update({
      stripe_connect_onboarded: !!account.charges_enabled,
    }).eq('stripe_connect_account_id', account.id)
  }

  return NextResponse.json({ received: true })
}
