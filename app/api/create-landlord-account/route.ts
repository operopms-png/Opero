import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'
import { sendPortalInvite } from '@/lib/portal-invite'

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
    const { data: l } = await serviceClient.from('pm_landlords').select('name, user_id').eq('id', landlord_id).maybeSingle()
    const emailed = await sendPortalInvite({ email, name: l?.name, businessId: l?.user_id, who: 'landlord' })
    return NextResponse.json({ success: true, emailed })
  }
  return NextResponse.json({ success: true })
}
