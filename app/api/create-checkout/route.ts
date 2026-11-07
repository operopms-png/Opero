export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/brand'

// Novourq sells one thing: all-modules access, either monthly or as a one-time
// lifetime payment. The two Stripe price IDs live in Netlify env vars so the
// price can change in Stripe without a code change:
//   STRIPE_PRICE_NOVOURQ_MONTHLY   (recurring, £49 / month)
//   STRIPE_PRICE_NOVOURQ_ONETIME   (one-off, £470.40 = £588 less 20%)
// The webhook (app/api/stripe-webhook/route.ts) reads the same two vars.
const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_NOVOURQ_MONTHLY,
  onetime: process.env.STRIPE_PRICE_NOVOURQ_ONETIME,
}

// The marketing site calls this from the browser, so it needs CORS. Only the
// website's own pages may be used as the "back" link when someone cancels.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const WEBSITE = /^https:\/\/(www\.)?thenovourq\.com(\/|$)/

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}

export async function POST(request: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
    const body = await request.json()
    const { plan, priceId, email, returnTo, cancelUrl } = body
    const finalPriceId = priceId || PRICE_IDS[plan]
    if (!finalPriceId) {
      const known = plan === 'monthly' || plan === 'onetime'
      return NextResponse.json({ error: known ? 'This plan is not set up yet' : 'Invalid plan' }, { status: 400, headers: CORS })
    }
    const isOneTime = plan === 'onetime'
    const successPath = returnTo || `/login?plan=${plan}&success=true`
    const cleanEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email.trim().slice(0, 200) : ''
    const back = typeof cancelUrl === 'string' && WEBSITE.test(cancelUrl) ? cancelUrl : `${SITE_URL}/settings`
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      ...(isOneTime ? {} : { subscription_data: { trial_period_days: 14 } }),
      // Prefilling this ties the payment reliably to the right account —
      // without it, Stripe just asks for an email fresh at checkout, and a
      // typo or different email there means the webhook can't match it to
      // any existing user.
      ...(cleanEmail ? { customer_email: cleanEmail } : {}),
      success_url: `${SITE_URL}${successPath}`,
      cancel_url: back,
      allow_promotion_codes: true,
      custom_text: { submit: { message: `By subscribing you agree to the Novourq Terms of Service (${SITE_URL}/terms) and Privacy Policy (${SITE_URL}/privacy).` } },
      // Asked at payment so the new client's emails and invoices carry their own company name from day one
      custom_fields: [{ key: 'company_name', label: { type: 'custom', custom: 'Company name' }, type: 'text', optional: true, text: { maximum_length: 120 } }],
    })
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })
    return NextResponse.json({ url: fullSession.url }, { headers: CORS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
