import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, ownsRow, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id } = await req.json()
  if (!owner_id) return NextResponse.json({ error: 'owner_id is required' }, { status: 400 })

  if (!(await ownsRow('owner_profiles', owner_id, staff.businessId, 'business_id'))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await serviceClient.from('owner_profiles').delete().eq('id', owner_id).eq('business_id', staff.businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
