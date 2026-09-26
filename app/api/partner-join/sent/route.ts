export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { alertEmailFor, esc } from '@/lib/partner-bank'

// New partner clicked "I've sent the payment" on /join/<slug>.
// Records it and emails the business's payment alerts address, once.
// Needs both the sign-up id and its reference (only the payer has them).
export async function POST(req: NextRequest) {
  try {
    const { signup_id, reference } = await req.json()
    if (!signup_id || !reference) return NextResponse.json({ error: 'Missing details' }, { status: 400 })

    const { data: signup } = await serviceClient
      .from('partner_signups')
      .select('id, business_id, name, email, phone, reference, status, marked_sent_at')
      .eq('id', signup_id)
      .eq('reference', String(reference))
      .maybeSingle()
    if (!signup) return NextResponse.json({ error: 'Sign-up not found' }, { status: 404 })
    if (signup.status === 'paid') return NextResponse.json({ ok: true, status: 'paid' })
    if (signup.marked_sent_at) return NextResponse.json({ ok: true })

    await serviceClient.from('partner_signups').update({ marked_sent_at: new Date().toISOString() }).eq('id', signup.id)

    const { data: link } = await serviceClient
      .from('partner_join_links')
      .select('business_id, alert_email, fee_gbp')
      .eq('business_id', signup.business_id)
      .maybeSingle()
    // In-app: bell notification for the business (Partners also shows a red badge)
    await serviceClient.from('notifications').insert({
      user_id: signup.business_id,
      module: 'sc',
      type: 'partner_payment',
      title: `${signup.name} says they've paid their partner membership (${signup.reference}). Check your bank, then Confirm.`,
      link: '/staff-centre/partners?tab=Investors',
      read: false,
    })

    const to = link ? await alertEmailFor(link) : null
    if (to) {
      const fee = Number(link?.fee_gbp) || 75
      const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://helloopero.com'
      await sendEmail(
        to,
        `Partner bank transfer to check: ${signup.reference}`,
        `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#101828;line-height:1.6">
          <p><b>${esc(signup.name)}</b> says they've sent their £${fee} partner membership by bank transfer.</p>
          <table style="border-collapse:collapse;margin:8px 0 16px">
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Reference</td><td><b>${esc(signup.reference)}</b></td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Email</td><td>${esc(signup.email)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Phone</td><td>${esc(signup.phone)}</td></tr>
          </table>
          <p>When the money shows in your bank with this reference, click <b>Confirm</b> in Partners → Investors to unlock their account.</p>
          <p><a href="${site}/staff-centre/partners" style="display:inline-block;background:#3B4AFF;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open Partners</a></p>
        </div>`,
        signup.email ?? undefined,
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[partner-join/sent]', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
