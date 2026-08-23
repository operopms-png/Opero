import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { serviceClient } from '@/lib/admin-auth'

// Handles Resend webhooks -- both inbound replies (email.received) and
// delivery/engagement tracking (email.delivered/opened/clicked/bounced/
// complained) for marketing_emails. One endpoint, subscribed to all of
// these event types in the Resend dashboard, rather than a separate
// webhook per event category.
//
// Setup required in Resend + Netlify before this does anything:
//  1. Add an MX record for a subdomain (e.g. reply.helloopero.com — NOT the
//     root domain, so it doesn't disturb any existing mail routing) per
//     Resend's Receiving Emails setup.
//  2. In Resend dashboard: Webhooks -> Add endpoint -> this route's URL,
//     subscribed to the email.received event. Copy the signing secret into
//     RESEND_WEBHOOK_SECRET in Netlify env vars.
//
// Tenant routing: Opero is multi-tenant, so we can't just match an inbound
// email's "from" address against crm_contacts across all accounts — that
// risks one client's reply landing in a different client's CRM. Instead,
// every email sent from the CRM (see app/api/crm-send) sets a Reply-To of
// crm+<user_id>.<contact_id>@helloopero.com. A reply preserves that address
// in its "to" field, so we parse the user_id/contact_id straight out of it.
// If no plus-alias is found (e.g. spam, or a client emailing the inbound
// address cold), the message is logged but left unmatched rather than
// guessed at.

function verifySvixSignature(payload: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, secret: string) {
  if (!headers.id || !headers.timestamp || !headers.signature) return false
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')
  return headers.signature
    .split(' ')
    .some((sig) => {
      const [, value] = sig.split(',')
      return value && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected))
    })
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const rawBody = await req.text()

  if (secret) {
    const valid = verifySvixSignature(rawBody, {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    }, secret)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  } else {
    console.log('[email-inbound] RESEND_WEBHOOK_SECRET not set — skipping signature check')
  }

  const event = JSON.parse(rawBody)

  // Delivery/engagement tracking for marketing_emails -- matched by
  // resend_email_id (set when the email was sent, see
  // app/api/marketing-send), not by a plus-alias, since these events
  // aren't inbound mail and have no To: address to parse.
  const TRACKED_EVENT_TYPES: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  }
  if (event.type in TRACKED_EVENT_TYPES) {
    const resendEmailId = event.data?.email_id
    if (!resendEmailId) return NextResponse.json({ received: true, matched: false })

    const { data: mktEmail } = await serviceClient.from('marketing_emails').select('id').eq('resend_email_id', resendEmailId).single()
    if (!mktEmail) return NextResponse.json({ received: true, matched: false })

    // Resend includes a parsed user-agent on open/click events where
    // available; fall back to 'Other' rather than guessing.
    const ua: string = event.data?.user_agent ?? event.data?.client?.name ?? ''
    const deviceType = /mobile|android|iphone/i.test(ua) ? 'Mobile' : /mozilla|chrome|safari|firefox|edge/i.test(ua) ? 'Desktop' : 'Other'

    await serviceClient.from('marketing_email_events').insert({
      marketing_email_id: mktEmail.id,
      type: TRACKED_EVENT_TYPES[event.type],
      device_type: ['opened', 'clicked'].includes(TRACKED_EVENT_TYPES[event.type]) ? deviceType : null,
    })

    return NextResponse.json({ received: true, matched: true, type: 'tracking' })
  }

  if (event.type !== 'email.received') return NextResponse.json({ received: true })

  const emailId = event.data?.email_id
  const toAddresses: string[] = event.data?.to ?? []
  const fromAddress: string = event.data?.from ?? ''
  const subject: string = event.data?.subject ?? '(no subject)'

  // Same pattern as the marketing+ handling below -- a short per-contact
  // reply_token instead of encoding user_id + contact_id directly (see
  // migrations/fix-crm-reply-token-length.sql). No-contact sends never
  // set a Reply-To at all now (see app/api/crm-send), so there's no
  // fallback "crm+<user_id> only" form to match anymore.
  const aliasMatch = toAddresses
    .map((addr) => addr.match(/crm\+([a-zA-Z0-9]+)@/i))
    .find((m) => m)

  // Same idea as the crm+ alias above, but for marketing_emails.
  // Uses a short reply_token instead of encoding IDs directly in the
  // address -- two UUIDs would exceed the 64-character limit on the
  // local part of an email address (see
  // fix-marketing-email-reply-token-length.sql).
  const marketingAliasMatch = toAddresses
    .map((addr) => addr.match(/marketing\+([a-zA-Z0-9]+)@/i))
    .find((m) => m)

  if (marketingAliasMatch) {
    const [, replyToken] = marketingAliasMatch
    const { data: mktEmail } = await serviceClient.from('marketing_emails').select('id').eq('reply_token', replyToken).single()

    if (!mktEmail) {
      console.log('[email-inbound] marketing+ alias matched but no email found for token:', replyToken)
      return NextResponse.json({ received: true, matched: false })
    }

    let mktBody = ''
    if (process.env.RESEND_API_KEY && emailId) {
      const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
      if (res.ok) {
        const full = await res.json()
        mktBody = full.text || full.html || ''
      } else {
        console.error('[email-inbound] Failed to fetch full email body:', await res.text())
      }
    }

    await serviceClient.from('marketing_email_replies').insert({
      marketing_email_id: mktEmail.id,
      from_address: fromAddress,
      subject: `Reply: ${subject}`,
      body: mktBody || `(From ${fromAddress} — body unavailable)`,
    })

    return NextResponse.json({ received: true, matched: true, type: 'marketing' })
  }

  if (!aliasMatch) {
    console.log('[email-inbound] No crm+ or marketing+ alias match in to:', toAddresses, '- unmatched, not logged')
    return NextResponse.json({ received: true, matched: false })
  }

  const [, replyToken] = aliasMatch
  const { data: contact } = await serviceClient.from('crm_contacts').select('id,user_id').eq('reply_token', replyToken).single()

  if (!contact) {
    console.log('[email-inbound] crm+ alias matched but no contact found for token:', replyToken)
    return NextResponse.json({ received: true, matched: false })
  }

  let body = ''
  if (process.env.RESEND_API_KEY && emailId) {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (res.ok) {
      const full = await res.json()
      body = full.text || full.html || ''
    } else {
      console.error('[email-inbound] Failed to fetch full email body:', await res.text())
    }
  }

  await serviceClient.from('crm_activities').insert({
    user_id: contact.user_id,
    contact_id: contact.id,
    type: 'email',
    subject: `Reply: ${subject}`,
    body: body || `(From ${fromAddress} — body unavailable)`,
    module: 'crm',
  })

  return NextResponse.json({ received: true, matched: true })
}
