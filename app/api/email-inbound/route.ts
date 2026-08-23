import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { serviceClient } from '@/lib/admin-auth'

// Handles Resend's email.received webhook (inbound replies to CRM emails).
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
  if (event.type !== 'email.received') return NextResponse.json({ received: true })

  const emailId = event.data?.email_id
  const toAddresses: string[] = event.data?.to ?? []
  const fromAddress: string = event.data?.from ?? ''
  const subject: string = event.data?.subject ?? '(no subject)'

  const aliasMatch = toAddresses
    .map((addr) => addr.match(/crm\+([a-f0-9-]+)(?:\.([a-f0-9-]+))?@/i))
    .find((m) => m)

  // Same idea as the crm+ alias above, but for marketing_emails --
  // marketing+<user_id>.<marketing_email_id>@helloopero.com. Checked
  // separately since it routes to a different table.
  const marketingAliasMatch = toAddresses
    .map((addr) => addr.match(/marketing\+([a-f0-9-]+)\.([a-f0-9-]+)@/i))
    .find((m) => m)

  if (marketingAliasMatch) {
    const [, , marketingEmailId] = marketingAliasMatch

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
      marketing_email_id: marketingEmailId,
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

  const [, userId, contactId] = aliasMatch

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
    user_id: userId,
    contact_id: contactId || null,
    type: 'email',
    subject: `Reply: ${subject}`,
    body: body || `(From ${fromAddress} — body unavailable)`,
    module: 'crm',
  })

  return NextResponse.json({ received: true, matched: true })
}
