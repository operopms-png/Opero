import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as supabase } from '@/lib/admin-auth'
import { assignProperty } from '@/lib/owner-properties'

export async function POST(req: NextRequest) {
  // Only signed-in staff can create investor/owner logins. The new owner is
  // tied to the creating staff member's business (business_id), which is
  // what gives them access to that business's Partners Broadcast.
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { first_name, last_name, email, phone, password, property_ids } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Runs server-side with the service role key, so this never touches
  // the admin's browser session (unlike client-side supabase.auth.signUp()).
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { data: profile, error: profileError } = await supabase.from('owner_profiles').insert({
    user_id: data.user.id,
    business_id: staff.businessId,
    name: `${first_name} ${last_name}`.trim(),
    email,
    phone,
    property_ids: [],
    split_percentage: 60,
  }).select('id').single()

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned login with no profile
    await supabase.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Profile creation failed: ' + profileError.message }, { status: 500 })
  }

  // Optionally link the new client to properties straight away (e.g. from Customer Onboarding)
  const linkErrors: string[] = []
  for (const pid of Array.isArray(property_ids) ? property_ids.slice(0, 50) : []) {
    const err = await assignProperty(staff.businessId, String(pid), profile!.id)
    if (err) linkErrors.push(err)
  }

  return NextResponse.json({ success: true, user_id: data.user.id, owner_id: profile!.id, link_errors: linkErrors })
}
