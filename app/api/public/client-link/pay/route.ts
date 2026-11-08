export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { businessStripeAccount, getStripe } from '@/lib/stripe-connect'
import { SITE_URL } from '@/lib/brand'
import { PERSON_KINDS, resolveLink } from '@/lib/client-link'

// Pay one invoice by card from the secure link. The amount comes from the invoice in the database, never from the browser.
// The money goes to the company's own connected Stripe account; the stripe-webhook marks the invoice paid.
//   POST {t, invoice_id} → {url}
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const r = await resolveLink(String(b.t || '')); if (!r) return bad('This link has expired. Please ask us for a new one.', 404)
  const { data: inv } = await db.from('invoices').select('*').eq('id', String(b.invoice_id || '')).eq('business_id', r.link.business_id).in('person_kind', PERSON_KINDS[r.subject]).eq('person_id', r.rec.id).maybeSingle()
  if (!inv || !['sent', 'overdue'].includes(inv.status)) return bad('That invoice cannot be paid here.', 404)
  const amount = Math.round(Number(inv.total) * 100)
  if (!(amount >= 100)) return bad('That invoice has no amount to pay.')
  const account = await businessStripeAccount(r.link.business_id)
  if (!account) return bad('Card payment is not set up yet. Please use the bank details on your invoice.')
  try {
    const stripe = await getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', payment_method_types: ['card'], customer_email: /^[^@\s]+@[^@\s]+$/.test(r.rec.email || '') ? r.rec.email : undefined,
      line_items: [{ price_data: { currency: String(inv.currency || 'GBP').toLowerCase(), product_data: { name: `Invoice ${inv.number}`, description: String(inv.note || '').slice(0, 200) || undefined }, unit_amount: amount }, quantity: 1 }],
      metadata: { type: 'invoice_payment', invoice_id: inv.id, business_id: r.link.business_id },
      success_url: `${SITE_URL}/d/${b.t}?paid=1`, cancel_url: `${SITE_URL}/d/${b.t}`,
    }, { stripeAccount: account })
    return NextResponse.json({ url: session.url })
  } catch (e: any) { return bad('Card payment could not be started: ' + (e?.message || 'unknown error'), 500) }
}
