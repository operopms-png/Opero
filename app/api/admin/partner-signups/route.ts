export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'
import { activatePartnerSignup } from '@/lib/partner-activation'
import { sendEmail } from '@/lib/send-email'
import { esc } from '@/lib/partner-bank'

// Staff actions on pending bank-transfer partner sign-ups (Partners → Investors):
//   action 'confirm' → money received: unlock the login, create the partner
//                      record, email the partner their sign-in link
//   action 'cancel'  → never paid: remove the pending sign-up and its locked login
export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { signup_id, action } = await req.json()
  const { data: signup } = await serviceClient
    .from('partner_signups')
    .select('id, business_id, user_id, name, email, reference, status')
    .eq('id', signup_id)
    .maybeSingle()
  if (!signup || signup.business_id !== staff.businessId) return NextResponse.json({ error: 'Sign-up not found' }, { status: 404 })
  if (signup.status !== 'pending') return NextResponse.json({ error: 'This sign-up is already ' + signup.status }, { status: 400 })

  if (action === 'confirm') {
    try {
      await activatePartnerSignup(signup.id, `bank:${signup.reference ?? 'transfer'}`)
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Could not activate' }, { status: 500 })
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://helloopero.com'
    if (signup.email) {
      await sendEmail(
        signup.email,
        'Your partner account is ready',
        `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#101828;line-height:1.6">
          <p>Hi ${esc(signup.name ?? '')},</p>
          <p>We've received your membership payment, so your partner account is now active.</p>
          <p>Sign in with the email and password you chose when you signed up.</p>
          <p><a href="${site}/login?redirect=/staff-centre/partners&email=${encodeURIComponent(signup.email)}" style="display:inline-block;background:#3B4AFF;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
        </div>`,
      )
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'cancel') {
    await serviceClient.from('partner_signups').delete().eq('id', signup.id)
    // Remove the locked login too, unless it's used anywhere else
    if (signup.user_id) {
      const { data: profile } = await serviceClient.from('owner_profiles').select('id').eq('user_id', signup.user_id).maybeSingle()
      const { data: team } = signup.email
        ? await serviceClient.from('team_members').select('id').ilike('email', signup.email).limit(1).maybeSingle()
        : { data: null }
      const { data: other } = await serviceClient.from('partner_signups').select('id').eq('user_id', signup.user_id).limit(1)
      if (!profile && !team && !(other?.length)) await serviceClient.auth.admin.deleteUser(signup.user_id)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
