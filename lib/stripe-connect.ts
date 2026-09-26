import { serviceClient } from '@/lib/admin-auth'

// Shared Stripe Connect helpers.
//
// Each business on Opero connects its own Stripe account (Settings →
// Billing & Subscriptions). Customer payments are DIRECT charges on that
// account: the checkout session is created with { stripeAccount }, so the
// money, the Stripe fees and any disputes all sit with the business, and
// Stripe (not Opero) covers unrecoverable losses. Nothing is ever charged on
// Opero's own account for a business's customers.

export async function getStripe() {
  const Stripe = (await import('stripe')).default
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
}

// The business's connected account id, only once it can take payments.
export async function businessStripeAccount(businessId: string): Promise<string | null> {
  const { data } = await serviceClient
    .from('subscriptions')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('user_id', businessId)
    .maybeSingle()
  return data?.stripe_connect_onboarded && data.stripe_connect_account_id ? data.stripe_connect_account_id : null
}

// Asks Stripe whether a connected account can take card payments yet.
export async function stripeAccountReady(accountId: string): Promise<boolean> {
  const stripe = await getStripe()
  try {
    const account: any = await stripe.v2.core.accounts.retrieve(accountId, { include: ['configuration.merchant'] })
    return account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active'
  } catch {
    // Older (v1) connected accounts
    const account = await stripe.accounts.retrieve(accountId)
    return !!account.charges_enabled
  }
}
