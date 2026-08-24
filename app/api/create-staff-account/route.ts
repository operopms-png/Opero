import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, phone, role, password, property_ids, custom_modules } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Runs server-side with the service role key — creates the login
  // directly with a real password instead of relying on an invite email
  // (useful while SMTP delivery is unreliable).
  let { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })

  if (error?.message?.includes('already been registered')) {
    // An auth login exists under this email with no team_members row
    // pointing to it anymore (e.g. the row was deleted in Team
    // Management, which only removes our own table — it doesn't touch
    // Supabase's actual auth system). Confirm nothing else still
    // references it, then clear it out and recreate.
    const { data: existingMembers } = await serviceClient.from('team_members').select('id').eq('email', email)
    if (existingMembers && existingMembers.length > 0) {
      return NextResponse.json({ error: 'This email is already an active team member. Edit that entry instead, or delete it first.' }, { status: 409 })
    }
    const { data: userList } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
    const orphan = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (orphan) {
      await serviceClient.auth.admin.deleteUser(orphan.id)
      ;({ data, error } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      }))
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { data: member, error: memberError } = await serviceClient.from('team_members').upsert({
    user_id: staffId,
    name,
    email,
    phone: phone || null,
    role,
    property_ids: property_ids || [],
    custom_modules: custom_modules?.length ? custom_modules : null,
    status: 'Active',
  }).select().single()

  if (memberError) {
    // Roll back the auth user so we don't leave an orphaned login with no team_members row
    await serviceClient.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Team member record creation failed: ' + memberError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, member })
}
