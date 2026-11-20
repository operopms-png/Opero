import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import { docSettings } from '@/lib/documents'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { landlord_id, email, password: given } = await req.json()
  // No password given = invite: we make a random one nobody sees and email the landlord a link to set their own.
  const invite = !given
  const password: string = given || (crypto.randomUUID() + crypto.randomUUID())
  if (!landlord_id || !email) {
    return NextResponse.json({ error: 'landlord_id and email are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'landlord' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { error: linkError } = await serviceClient
    .from('pm_landlords')
    .update({ portal_user_id: data.user.id, email })
    .eq('id', landlord_id)

  if (linkError) {
    // Roll back the auth user so we don't leave an orphaned login
    await serviceClient.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Failed to link account: ' + linkError.message }, { status: 500 })
  }

  if (invite) {
    try {
      const { data: l } = await serviceClient.from('pm_landlords').select('name, user_id').eq('id', landlord_id).maybeSingle()
      const co = await docSettings(l?.user_id || '')
      const link = await serviceClient.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${SITE_URL}/reset-password` } })
      const url = link.data?.properties?.action_link
      if (!url) throw new Error('no link')
      const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      await sendEmail(email, `Your ${co.company_name} landlord portal: set your password`, `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1D2433"><h2 style="margin:0 0 12px;color:#182D5E">Welcome to ${esc(co.company_name)}</h2><p>Hello ${esc(l?.name || '')},</p><p>Your landlord portal is ready. See your properties, payments, receipts and documents in one place. Set your password to sign in.</p><p style="margin:20px 0"><a href="${url}" style="background:#182D5E;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">Set my password</a></p><p style="color:#667085;font-size:13px">After that, sign in any time at ${SITE_URL.replace(/^https?:\/\//, '')}/login. If you did not expect this email, you can ignore it.</p></div>`, co.reply_to || undefined)
    } catch {
      return NextResponse.json({ success: true, emailed: false })
    }
    return NextResponse.json({ success: true, emailed: true })
  }
  return NextResponse.json({ success: true })
}
