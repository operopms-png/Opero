import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function PATCH(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json()
  const { booking_id } = body
  if (!booking_id) return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })

  const patch: Record<string, any> = {}
  if ('status' in body) patch.status = body.status
  if ('total_amount' in body) patch.total_amount = body.total_amount === '' ? null : Number(body.total_amount)
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await serviceClient.from('bookings').update(patch).eq('id', booking_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
