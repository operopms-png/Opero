export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { businessStripeAccount, getStripe } from '@/lib/stripe-connect'
import { ensureCheckin, sendCheckinEmail, checkinUrl, ID_BUCKET, type BookingTable } from '@/lib/guest-checkin'

// The team's side of guest check-in (Real Estate Intelligence → Guest Check-ins). Admins, Co Founders and the
// property teams only, scoped to the caller's own company. ID photos are returned as links that expire in 5 minutes.
//   GET                                  → arrivals from a week ago to 60 days ahead, with check-in progress
//   POST {action:'send', booking_table, booking_id}   → create the guest's link and email it
//   POST {action:'remind', id}                        → email the guest again
//   POST {action:'charge', id, amount, reason}        → charge the saved card for damage (never more than the deposit)
//   POST {action:'release', id}                       → release the deposit: forget the saved card
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental/i.test(c.role || '')
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!allowed(c)) return bad('Only admins and property teams can open this.', 403)
  const { data: props } = await db.from('properties').select('id, name, user_id, security_deposit, checkin_terms, house_rules, online_checkin').eq('user_id', c.businessId).is('ended_at', null)
  const byId = new Map((props ?? []).map((p: any) => [p.id, p]))
  const ids = Array.from(byId.keys())
  if (!ids.length) return NextResponse.json({ items: [], enabledCount: 0 })

  const [{ data: a }, { data: d }, { data: rows }] = await Promise.all([
    db.from('bookings').select('id, property_id, guest_name, guest_email, guest_phone, check_in, check_out, status').in('property_id', ids).neq('status', 'cancelled').gte('check_in', day(-7)).lte('check_in', day(60)),
    db.from('direct_bookings').select('id, property_id, guest_name, guest_email, guest_phone, check_in, check_out, status').in('property_id', ids).eq('status', 'confirmed').gte('check_in', day(-7)).lte('check_in', day(60)),
    db.from('guest_checkins').select('*').eq('user_id', c.businessId),
  ])
  const have = new Map((rows ?? []).map((r: any) => [r.booking_table + ':' + r.booking_id, r]))
  const all = [...(a ?? []).map((b: any) => ({ t: 'bookings' as BookingTable, b })), ...(d ?? []).map((b: any) => ({ t: 'direct_bookings' as BookingTable, b }))]
    .sort((x, y) => String(x.b.check_in).localeCompare(String(y.b.check_in)))

  const items = []
  for (const { t, b } of all) {
    const p: any = byId.get(b.property_id)
    const r: any = have.get(t + ':' + b.id)
    if (!r && !p.online_checkin) continue            // not using online check-in for this property and nothing sent yet
    let files: { name: string; url: string | null }[] = []
    if (r?.id_files?.length) {
      const { data: signed } = await db.storage.from(ID_BUCKET).createSignedUrls(r.id_files.map((f: any) => f.path), 300)
      files = r.id_files.map((f: any, i: number) => ({ name: f.name, url: signed?.[i]?.signedUrl ?? null }))
    }
    const deposit = Number(r?.deposit_amount ?? p.security_deposit) || 0
    items.push({
      id: r?.id ?? null, booking_table: t, booking_id: b.id,
      guest: r?.guest_name || b.guest_name || 'Guest', email: r?.guest_email || b.guest_email || null, phone: r?.guest_phone || b.guest_phone || null,
      property: p.name, check_in: b.check_in, check_out: b.check_out,
      arrival_time: r?.arrival_time ?? null, num_guests: r?.num_guests ?? null,
      sent: !!r?.link_sent_at, status: r?.status ?? 'not_sent',
      id_files: files, has_id: files.length > 0,
      deposit: { amount: deposit, status: r?.deposit_status ?? 'none', charged: r?.deposit_charged_amount ?? null, reason: r?.deposit_charge_reason ?? null },
      terms: { signed: !!r?.terms_accepted_at, name: r?.terms_signed_name ?? null, at: r?.terms_accepted_at ?? null },
      link: r ? checkinUrl(r.token) : null, completed_at: r?.completed_at ?? null,
    })
  }
  return NextResponse.json({ items, enabledCount: (props ?? []).filter((p: any) => p.online_checkin).length })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!allowed(c)) return bad('Only admins and property teams can do this.', 403)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'send') {
    if (!['bookings', 'direct_bookings'].includes(b.booking_table)) return bad('Unknown booking.')
    const { data: bk } = await db.from(b.booking_table).select('*').eq('id', b.booking_id).maybeSingle()
    if (!bk) return bad('Booking not found.', 404)
    const { data: p } = await db.from('properties').select('id, name, user_id, security_deposit, checkin_terms, house_rules').eq('id', bk.property_id).maybeSingle()
    if (!p || p.user_id !== c.businessId) return bad('Booking not found.', 404)
    const row = await ensureCheckin(b.booking_table, bk, p)
    if (!row.guest_email) return NextResponse.json({ ok: true, link: checkinUrl(row.token), emailed: false, note: 'This booking has no guest email. Copy the link and send it yourself.' })
    const r = await sendCheckinEmail(row, p, bk, !!row.link_sent_at)
    return NextResponse.json({ ok: true, link: checkinUrl(row.token), emailed: !!r.sent })
  }

  const { data: row } = await db.from('guest_checkins').select('*').eq('id', String(b.id || '')).maybeSingle()
  if (!row || row.user_id !== c.businessId) return bad('Check-in not found.', 404)

  if (b.action === 'remind') {
    const { data: bk } = await db.from(row.booking_table).select('check_in, check_out').eq('id', row.booking_id).maybeSingle()
    const { data: p } = await db.from('properties').select('name').eq('id', row.property_id).maybeSingle()
    if (!bk || !p) return bad('Booking not found.', 404)
    if (!row.guest_email) return bad('This guest has no email address.')
    const r = await sendCheckinEmail(row, p, bk, true)
    return NextResponse.json({ ok: true, emailed: !!r.sent })
  }

  if (b.action === 'charge') {
    const amount = Math.round(Number(b.amount) * 100) / 100
    const reason = String(b.reason || '').trim().slice(0, 300)
    if (row.deposit_status !== 'card_saved' || !row.stripe_customer_id || !row.stripe_payment_method_id) return bad('There is no saved card to charge.')
    if (!(amount > 0) || amount > Number(row.deposit_amount)) return bad(`Enter an amount up to the deposit of ${Number(row.deposit_amount).toFixed(2)}.`)
    if (reason.length < 3) return bad('Please say what the charge is for.')
    const account = await businessStripeAccount(row.user_id)
    if (!account || !process.env.STRIPE_SECRET_KEY) return bad('Card payments are not set up for this company.')
    const stripe = await getStripe()
    try {
      await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), currency: row.deposit_currency, customer: row.stripe_customer_id, payment_method: row.stripe_payment_method_id,
        off_session: true, confirm: true, description: `Security deposit claim: ${reason}`, metadata: { guest_checkin: row.id },
      }, { stripeAccount: account, idempotencyKey: `checkin-charge-${row.id}` })
    } catch (e: any) {
      await db.from('guest_checkins').update({ deposit_status: 'failed' }).eq('id', row.id)
      return bad(e?.message || 'The card was declined.', 402)
    }
    await db.from('guest_checkins').update({ deposit_status: 'charged', deposit_charged_amount: amount, deposit_charge_reason: reason }).eq('id', row.id)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'release') {
    if (row.deposit_status === 'charged') return bad('The deposit has already been charged.')
    const account = await businessStripeAccount(row.user_id)
    if (account && row.stripe_payment_method_id && process.env.STRIPE_SECRET_KEY) {
      try { await (await getStripe()).paymentMethods.detach(row.stripe_payment_method_id, undefined, { stripeAccount: account }) } catch { /* already gone */ }
    }
    await db.from('guest_checkins').update({ deposit_status: 'released', stripe_payment_method_id: null }).eq('id', row.id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action.')
}
