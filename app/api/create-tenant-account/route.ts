import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenant_id, email, password } = await req.json()
  if (!tenant_id || !email || !password) {
    return NextResponse.json({ error: 'tenant_id, email, and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'tenant' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { error: linkError } = await serviceClient
    .from('pm_tenants')
    .update({ portal_user_id: data.user.id, email })
    .eq('id', tenant_id)

  if (linkError) {
    // Roll back the auth user so we don't leave an orphaned login
    await serviceClient.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Failed to link account: ' + linkError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
