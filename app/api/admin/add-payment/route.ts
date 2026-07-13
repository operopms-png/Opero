import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, property_name, period_start, period_end, amount, description, status } = await req.json()
  if (!owner_id || !amount) return NextResponse.json({ error: 'owner_id and amount are required' }, { status: 400 })

  const { error } = await serviceClient.from('owner_statements').insert({
    owner_id,
    property_name,
    period_start: period_start || new Date().toISOString().slice(0, 10),
    period_end: period_end || new Date().toISOString().slice(0, 10),
    owner_amount: Number(amount),
    notes: description,
    status: status || 'paid',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
