import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { first_name, last_name, email, phone, password } = await req.json()

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

  const { error: profileError } = await supabase.from('owner_profiles').insert({
    user_id: data.user.id,
    name: `${first_name} ${last_name}`.trim(),
    email,
    phone,
    property_ids: [],
    split_percentage: 60,
  })

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned login with no profile
    await supabase.auth.admin.deleteUser(data.user.id)
    return NextResponse.json({ error: 'Profile creation failed: ' + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, user_id: data.user.id })
}
