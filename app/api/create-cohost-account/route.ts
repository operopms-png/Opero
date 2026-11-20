import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'
import { sendPortalInvite } from '@/lib/portal-invite'

// Staff create a portal login for a co-host and link it to their record.
export async function POST(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { cohost_id, email, password: given } = await req.json()
  // No password given = invite: a random one nobody sees, and the co-host is emailed a link to set their own.
  const invite = !given
  const password: string = given || (crypto.randomUUID() + crypto.randomUUID())
  if (!cohost_id || !email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (String(password).length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  const { data: rec } = await serviceClient.from('cohosts').select('id, user_id').eq('id', cohost_id).maybeSingle()
  if (!rec || rec.user_id !== who.businessId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'cohost' } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { error: le } = await serviceClient.from('cohosts').update({ portal_user_id: data.user!.id, email }).eq('id', cohost_id)
  if (le) { await serviceClient.auth.admin.deleteUser(data.user!.id); return NextResponse.json({ error: 'Could not link the account: ' + le.message }, { status: 500 }) }
  if (invite) {
    const { data: c } = await serviceClient.from('cohosts').select('name').eq('id', cohost_id).maybeSingle()
    const emailed = await sendPortalInvite({ email, name: c?.name, businessId: who.businessId, who: 'cohost' })
    return NextResponse.json({ success: true, emailed })
  }
  return NextResponse.json({ success: true })
}
