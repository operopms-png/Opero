import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

// Mirrors app/api/create-landlord-account for PM, applied to
// estate_landlords instead of pm_landlords. Creates the actual Supabase
// auth user for the landlord, then links it via portal_user_id -- never
// user_id, which stays pointed at the agency's own account (see the
// migration's comment on why that distinction matters).
export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { landlord_id, email, password } = await req.json()
  if (!landlord_id || !email || !password) {
    return NextResponse.json({ error: 'landlord_id, email, and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'estate_landlord' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { error: linkError } = await serviceClient
    .from('estate_landlords')
    .update({ portal_user_id: data.user.id, email })
    .eq('id', landlord_id)

  if (linkError) {
    // Roll back the auth user so we don't leave an orphaned login
    await serviceClient.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Failed to link account: ' + linkError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
