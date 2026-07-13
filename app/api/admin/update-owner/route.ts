import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, name, email, phone, invested, split_percentage, property_ids } = await req.json()
  if (!owner_id) return NextResponse.json({ error: 'owner_id is required' }, { status: 400 })

  const { error } = await serviceClient.from('owner_profiles').update({
    name, email, phone,
    invested: Number(invested) || 0,
    split_percentage: Number(split_percentage) || 0,
    property_ids: property_ids ?? [],
  }).eq('id', owner_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
