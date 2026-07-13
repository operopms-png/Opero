import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { booking_id, status } = await req.json()
  if (!booking_id || !status) return NextResponse.json({ error: 'booking_id and status are required' }, { status: 400 })

  const { error } = await serviceClient.from('bookings').update({ status }).eq('id', booking_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
