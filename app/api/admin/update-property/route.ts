import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, purchase_price, down_payment, platform, status, address } = await req.json()
  if (!property_id) return NextResponse.json({ error: 'property_id is required' }, { status: 400 })

  const { error } = await serviceClient.from('properties').update({
    purchase_price: Number(purchase_price) || 0,
    down_payment: Number(down_payment) || 0,
    platform,
    status,
    address,
  }).eq('id', property_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
