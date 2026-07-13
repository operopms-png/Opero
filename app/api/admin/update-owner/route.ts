import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json()
  const { owner_id } = body
  if (!owner_id) return NextResponse.json({ error: 'owner_id is required' }, { status: 400 })

  // Partial update: only touch fields actually sent, so e.g. editing just
  // 'invested' from a list view doesn't wipe out name/email/etc.
  const patch: Record<string, any> = {}
  if ('name' in body) patch.name = body.name
  if ('email' in body) patch.email = body.email
  if ('phone' in body) patch.phone = body.phone
  if ('invested' in body) patch.invested = Number(body.invested) || 0
  if ('split_percentage' in body) patch.split_percentage = Number(body.split_percentage) || 0
  if ('property_ids' in body) patch.property_ids = body.property_ids ?? []

  const { error } = await serviceClient.from('owner_profiles').update(patch).eq('id', owner_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
