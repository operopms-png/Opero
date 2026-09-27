import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'

// Property onboarding progress (properties.staging_stage = number of steps done, in order).
// Shared by the Owner Portal and Staff Centre -> Customer Onboarding, so both always match.
export async function PATCH(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, stage } = await req.json()
  if (!property_id || typeof stage !== 'number') {
    return NextResponse.json({ error: 'property_id and a numeric stage are required' }, { status: 400 })
  }
  const safeStage = Math.max(0, Math.min(10, Math.round(stage)))

  const { data, error } = await serviceClient.from('properties').update({ staging_stage: safeStage })
    .eq('id', property_id).eq('user_id', staff.businessId).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
