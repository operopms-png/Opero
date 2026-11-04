import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { loadBuildingFloors } from '@/lib/property-map'

// GET ?source=pm|estate&building=<id> -> the building's flats by floor, each with a status
export async function GET(req: NextRequest) {
  const s = await requireStaffWithBusiness(req)
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const source = req.nextUrl.searchParams.get('source') === 'estate' ? 'estate' : 'pm'
  const id = req.nextUrl.searchParams.get('building') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Missing building' }, { status: 400 })
  const d = await loadBuildingFloors(s.businessId, source, id)
  return d ? NextResponse.json(d, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Building not found' }, { status: 404 })
}
