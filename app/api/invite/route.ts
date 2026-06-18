import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { name, email, role, owner_id } = await req.json()

  const { error: dbError } = await supabase.from('team_members').upsert({
    owner_id,
    name,
    email,
    role,
    status: 'Pending'
  })
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: 'https://helloopero.com/login'
  })
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
