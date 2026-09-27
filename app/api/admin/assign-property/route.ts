import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { assignProperty } from '@/lib/owner-properties'

// Links a property to one owner (client), or unlinks it with owner_id: null.
// Only works inside the signed-in staff member's own business.
export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, owner_id } = await req.json()
  if (!property_id) return NextResponse.json({ error: 'property_id is required' }, { status: 400 })

  const err = await assignProperty(staff.businessId, property_id, owner_id || null)
  if (err) return NextResponse.json({ error: err }, { status: err.endsWith('not found') ? 404 : 500 })
  return NextResponse.json({ success: true })
}
