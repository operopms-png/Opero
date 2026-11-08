export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { businessStripeAccount, getStripe } from '@/lib/stripe-connect'
import { SITE_URL } from '@/lib/brand'
import { ID_KEEP_DAYS, notifyTeamCheckinComplete } from '@/lib/guest-checkin'

// The guest's check-in page talks to this route. The long random token in the link is the only credential,
// and nothing about any other guest or booking is ever returned.
//   GET  ?token=…                       → what the page needs to show
//   POST {token, action: 'details' | 'terms' | 'deposit_start' | 'deposit_verify' | 'submit', …}
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TOKEN_RE = /^[0-9a-f]{20,64}$/

async function load(token: string) {
  if (!TOKEN_RE.test(token || '')) return null
  const { data: row } = await db.from('guest_checkins').select('*').eq('token', token).maybeSingle()
  if (!row) return null
  const { data: property } = await db.from('properties').select('id, name, address, city, user_id').eq('id', row.property_id).maybeSingle()
  const { data: booking } = await db.from(row.booking_table).select('check_in, check_out').eq('id', row.booking_id).maybeSingle()
  if (!property || !booking) return null
  return { row, property, booking }
}

function view(x: { row: any; property: any; booking: any }, stripeReady: boolean) {
  const { row, property, booking } = x
  const deposit = Number(row.deposit_amount) || 0
  return {
    property: { name: property.name, address: [property.address, property.city].filter(Boolean).join(', ') },
    booking: { check_in: booking.check_in, check_out: booking.check_out },
    guest: { name: row.guest_name || '', phone: row.guest_phone || '', arrival_time: row.arrival_time || '', num_guests: row.num_guests || null },
    ids: (row.id_files ?? []).map((f: any) => ({ path: f.path, name: f.name })),
    deposit: { amount: deposit, currency: row.deposit_currency, required: deposit > 0, status: row.deposit_status, stripeReady },
    terms: { text: row.terms_text || '', accepted: !!row.terms_accepted_at, signed_name: row.terms_signed_name || '' },
    status: row.status, keepDays: ID_KEEP_DAYS,
  }
}

export async function GET(req: NextRequest) {
  const x = await load(req.nextUrl.searchParams.get('token') || '')
  if (!x) return bad('This check-in link is not valid.', 404)
  const ready = !!(process.env.STRIPE_SECRET_KEY && await businessStripeAccount(x.property.user_id))
  return NextResponse.json(view(x, ready))
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const x = await load(String(b.token || ''))
  if (!x) return bad('This check-in link is not valid.', 404)
  const { row, property, booking } = x
  if (row.status === 'complete' && b.action !== 'deposit_verify') return bad('This check-in is already complete.')

  if (b.action === 'details') {
    const name = String(b.guest_name || '').trim().slice(0, 120), phone = String(b.guest_phone || '').trim().slice(0, 40)
    if (name.length < 2 || phone.length < 6) return bad('Please enter your full name and a phone number.')
    const guests = Math.max(1, Math.min(30, Number(b.num_guests) || 1))
    await db.from('guest_checkins').update({ guest_name: name, guest_phone: phone, arrival_time: String(b.arrival_time || '').slice(0, 40) || null, num_guests: guests }).eq('id', row.id)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'terms') {
    const name = String(b.signed_name || '').trim().slice(0, 120)
    if (b.accept !== true) return bad('Please tick the box to agree.')
    if (name.length < 3) return bad('Please type your full name to sign.')
    await db.from('guest_checkins').update({ terms_accepted_at: new Date().toISOString(), terms_signed_name: name }).eq('id', row.id)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'deposit_start') {
    if (!(Number(row.deposit_amount) > 0)) return bad('No deposit is needed for this stay.')
    const account = await businessStripeAccount(property.user_id)
    if (!account || !process.env.STRIPE_SECRET_KEY) return bad('Card saving is not set up for this property yet. Please contact your host.', 400)
    const stripe = await getStripe()
    let customer = row.stripe_customer_id as string | null
    if (!customer) {
      const c = await stripe.customers.create({ name: row.guest_name || undefined, email: row.guest_email || undefined, metadata: { guest_checkin: row.id } }, { stripeAccount: account })
      customer = c.id
      await db.from('guest_checkins').update({ stripe_customer_id: customer }).eq('id', row.id)
    }
    const back = `${SITE_URL}/checkin/${row.token}`
    const session = await stripe.checkout.sessions.create({
      mode: 'setup', customer, payment_method_types: ['card'], currency: row.deposit_currency,
      success_url: `${back}?deposit=done&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${back}?deposit=cancelled`,
      custom_text: { submit: { message: `Nothing is charged now. Your card is kept on file for the ${(Number(row.deposit_amount)).toFixed(2)} ${String(row.deposit_currency).toUpperCase()} security deposit and is only charged if there is damage. It is released after check-out.` } },
    } as any, { stripeAccount: account })
    return NextResponse.json({ url: session.url })
  }

  if (b.action === 'deposit_verify') {
    const account = await businessStripeAccount(property.user_id)
    if (!account || !b.session_id) return bad('Could not confirm the card.')
    const stripe = await getStripe()
    const s: any = await stripe.checkout.sessions.retrieve(String(b.session_id), { expand: ['setup_intent'] }, { stripeAccount: account })
    if (s.customer !== row.stripe_customer_id || s.status !== 'complete') return bad('The card was not saved. Please try again.')
    const pm = typeof s.setup_intent?.payment_method === 'string' ? s.setup_intent.payment_method : s.setup_intent?.payment_method?.id
    if (!pm) return bad('The card was not saved. Please try again.')
    await db.from('guest_checkins').update({ stripe_payment_method_id: pm, deposit_status: 'card_saved' }).eq('id', row.id).neq('deposit_status', 'charged')
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'submit') {
    const need = Number(row.deposit_amount) > 0
    if (!row.guest_name || !row.guest_phone) return bad('Please complete your details first.')
    if (!(row.id_files?.length > 0)) return bad('Please upload a photo of your ID first.')
    if (need && row.deposit_status !== 'card_saved') return bad('Please save a card for the security deposit first.')
    if (!row.terms_accepted_at) return bad('Please agree to the house rules and terms first.')
    await db.from('guest_checkins').update({ status: 'complete', completed_at: new Date().toISOString() }).eq('id', row.id)
    notifyTeamCheckinComplete({ ...row }, property, booking)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action.')
}
