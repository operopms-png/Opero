import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, ownsRow, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, message, attachment_url } = await req.json()
  if (!(await ownsRow('owner_profiles', owner_id, staff.businessId, 'business_id'))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!owner_id || (!message?.trim() && !attachment_url)) return NextResponse.json({ error: 'owner_id and message or attachment are required' }, { status: 400 })

  const { error } = await serviceClient.from('owner_messages').insert({
    owner_id,
    sender: 'staff',
    message: message?.trim() || '',
    attachment_url: attachment_url || null,
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
