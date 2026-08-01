import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, role, phone, property_ids } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const { data: member, error: dbError } = await serviceClient.from('team_members').upsert({
    user_id: staffId,
    name,
    email,
    role,
    phone: phone || null,
    property_ids: property_ids || [],
    status: 'Pending'
  }).select().single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: 'https://helloopero.com/login'
  })
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  return NextResponse.json({ success: true, member })
}
