export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { newReference } from '@/lib/partner-bank'

// Public partner sign-up: helloopero.com/join/<slug>
// 1. Creates the login straight away but BANNED, so nobody can sign in unpaid.
// 2. Records a pending sign-up, then either:
//    - card: sends them to Stripe for the one-time fee (direct charge on the
//      business's own connected Stripe account; refused if not connected), or
//    - bank: returns the business's bank details and a unique reference.
//      Staff confirm the transfer in Partners → Investors, which unlocks them.
// 3. Activation (lib/partner-activation.ts) unbans the login and creates their
//    partner record (owner_profiles), marked paid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BANNED = '876000h' // ~100 years; lifted once paid

export async function POST(req: NextRequest) {
  try {
    const { slug, name, email: rawEmail, phone, password, method: rawMethod } = await req.json()
    const email = String(rawEmail ?? '').trim().toLowerCase()
    const method = rawMethod === 'bank' ? 'bank' : 'card'

    if (!slug || !name?.trim() || !EMAIL_RE.test(email) || !phone?.trim()) {
      return NextResponse.json({ error: 'Please fill in your name, a valid email and your phone.' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'Your password must be at least 8 characters.' }, { status: 400 })
    }

    const { data: link } = await serviceClient
      .from('partner_join_links')
      .select('business_id, slug, fee_gbp, active, bank_name, bank_account_name, bank_sort_code, bank_account_number')
      .eq('slug', String(slug).toLowerCase())
      .maybeSingle()
    if (!link || !link.active) return NextResponse.json({ error: 'This sign-up link isn’t active.' }, { status: 404 })

    // Card: the fee goes to the business's own connected Stripe account only.
    let destination: string | null = null
    if (method === 'card') {
      const { data: businessSub } = await serviceClient
        .from('subscriptions')
        .select('stripe_connect_account_id, stripe_connect_onboarded')
        .eq('user_id', link.business_id)
        .maybeSingle()
      destination = businessSub?.stripe_connect_onboarded ? businessSub.stripe_connect_account_id : null
      if (!destination) {
        return NextResponse.json({ error: 'Card payments aren’t available yet. Please choose bank transfer.' }, { status: 400 })
      }
    } else if (!link.bank_sort_code || !link.bank_account_number) {
      return NextResponse.json({ error: 'Bank transfer isn’t available for this programme. Please contact the team who shared this link.' }, { status: 400 })
    }

    // Is there already a login with this email?
    const { data: userList } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
    const existing = userList?.users?.find(u => u.email?.toLowerCase() === email)

    let userId: string
    if (existing) {
      // Only allow a retry of an unfinished (unpaid) sign-up for this business
      const { data: pending } = await serviceClient
        .from('partner_signups')
        .select('id')
        .eq('user_id', existing.id)
        .eq('business_id', link.business_id)
        .eq('status', 'pending')
        .maybeSingle()
      if (!pending) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
      }
      const { error: updErr } = await serviceClient.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { name: name.trim(), phone: phone.trim() },
      })
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
      userId = existing.id
    } else {
      const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        ban_duration: BANNED,
        user_metadata: { name: name.trim(), phone: phone.trim() },
      })
      if (createErr || !created.user) return NextResponse.json({ error: createErr?.message || 'Could not create your account.' }, { status: 500 })
      userId = created.user.id
    }

    // One pending sign-up row per login + business
    const { data: prior } = await serviceClient
      .from('partner_signups')
      .select('id, reference')
      .eq('user_id', userId)
      .eq('business_id', link.business_id)
      .eq('status', 'pending')
      .maybeSingle()

    let signupId = prior?.id as string | undefined
    let reference = (prior?.reference as string | null) ?? null
    if (method === 'bank' && !reference) reference = newReference()

    const fields = { name: name.trim(), phone: phone.trim(), email, payment_method: method, ...(reference ? { reference } : {}) }
    if (signupId) {
      await serviceClient.from('partner_signups').update(fields).eq('id', signupId)
    } else {
      const { data: row, error: rowErr } = await serviceClient
        .from('partner_signups')
        .insert({ business_id: link.business_id, user_id: userId, ...fields })
        .select('id')
        .single()
      if (rowErr || !row) return NextResponse.json({ error: rowErr?.message || 'Could not start your sign-up.' }, { status: 500 })
      signupId = row.id
    }

    const fee = Number(link.fee_gbp) || 75

    if (method === 'bank') {
      return NextResponse.json({
        bank: {
          signup_id: signupId,
          reference,
          amount: fee,
          bank_name: link.bank_name,
          account_name: link.bank_account_name,
          sort_code: link.bank_sort_code,
          account_number: link.bank_account_number,
          email,
        },
      })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Partners membership (one-time)' },
          unit_amount: Math.round(fee * 100),
        },
        quantity: 1,
      }],
      metadata: { type: 'partner_join', signup_id: signupId! },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/join/${link.slug}`,
    }, { stripeAccount: destination! }) // direct charge on the business's own account
    await serviceClient.from('partner_signups').update({ stripe_session_id: session.id }).eq('id', signupId!)
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[partner-join]', err)
    return NextResponse.json({ error: err?.message || 'Something went wrong.' }, { status: 500 })
  }
}
