export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'

// Starts (or resumes) Stripe onboarding for the logged-in business, so the
// payments its customers make through Opero (tenant rent, partner
// memberships, direct bookings) go into the business's own Stripe account
// and bank, never Opero's.
//
// Accounts v2 with Stripe as the fees and losses collector (Managed Risk):
// Stripe handles fraud/credit risk and negative balances, the business pays
// its own Stripe fees, and gets the full Stripe Dashboard. Payments are made
// as direct charges on the business's account (see lib/stripe-connect.ts).
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe is not configured on the server' }, { status: 500 })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })

    const { data: sub } = await serviceClient.from('subscriptions').select('stripe_connect_account_id').eq('user_id', userId).single()

    let accountId = sub?.stripe_connect_account_id
    if (!accountId) {
      const { data: { user } } = await serviceClient.auth.admin.getUserById(userId)
      const account = await stripe.v2.core.accounts.create({
        contact_email: user?.email ?? undefined,
        dashboard: 'full',
        identity: { country: 'GB' },
        defaults: {
          currency: 'gbp',
          responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
        },
        configuration: {
          merchant: { capabilities: { card_payments: { requested: true } } },
        },
      })
      accountId = account.id
      const { error } = await serviceClient.from('subscriptions').update({ stripe_connect_account_id: accountId, stripe_connect_onboarded: false }).eq('user_id', userId)
      if (error) return NextResponse.json({ error: 'Failed to save connected account: ' + error.message }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant'],
          refresh_url: `${siteUrl}/settings?section=Billing%20%26%20Subscriptions&stripe_connect=refresh`,
          return_url: `${siteUrl}/settings?section=Billing%20%26%20Subscriptions&stripe_connect=return`,
        },
      },
    })

    return NextResponse.json({ url: link.url })
  } catch (err: any) {
    console.error('[stripe-connect/onboard]', err)
    return NextResponse.json({ error: err?.message || 'Stripe Connect setup failed.' }, { status: 500 })
  }
}
