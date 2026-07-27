import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { name, email, role, phone, user_id } = await req.json()
  if (!email?.trim() || !user_id) return NextResponse.json({ error: 'email and user_id are required' }, { status: 400 })

  const { data: member, error: dbError } = await supabase.from('team_members').upsert({
    user_id,
    name,
    email,
    role,
    phone: phone || null,
    status: 'Pending'
  }).select().single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: 'https://helloopero.com/login'
  })
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  return NextResponse.json({ success: true, member })
}
