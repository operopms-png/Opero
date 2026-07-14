import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { property_id, guest_name, guest_email, check_in, check_out, total_amount, platform, status } = await req.json()
  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: 'property_id, check_in and check_out are required' }, { status: 400 })
  }

  const { error } = await serviceClient.from('bookings').insert({
    property_id,
    guest_name: guest_name || null,
    guest_email: guest_email || null,
    check_in,
    check_out,
    total_amount: total_amount ? Number(total_amount) : null,
    platform: platform || null,
    status: status || 'confirmed',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
