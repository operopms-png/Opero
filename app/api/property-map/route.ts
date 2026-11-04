import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { loadPropertyMap } from '@/lib/property-map'

export const maxDuration = 30

// GET -> { items, unplaced }: every property and found deal with a status and a position
export async function GET(req: NextRequest) {
  const s = await requireStaffWithBusiness(req)
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json(await loadPropertyMap(s.businessId), { headers: { 'Cache-Control': 'no-store' } })
}
