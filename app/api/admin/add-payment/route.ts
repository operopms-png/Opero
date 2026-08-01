import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, property_name, period_start, period_end, amount, description, status } = await req.json()
  if (!owner_id || !amount) return NextResponse.json({ error: 'owner_id and amount are required' }, { status: 400 })

  const numericAmount = Number(amount)
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: `Amount must be a valid number greater than 0 — got "${amount}"` }, { status: 400 })
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  for (const [label, val] of [['Period start', period_start], ['Period end', period_end]] as const) {
    if (val && !dateRe.test(val)) {
      return NextResponse.json({ error: `${label} must be a valid date (YYYY-MM-DD) — got "${val}"` }, { status: 400 })
    }
  }

  const { error } = await serviceClient.from('owner_statements').insert({
    owner_id,
    property_name,
    period_start: period_start || new Date().toISOString().slice(0, 10),
    period_end: period_end || new Date().toISOString().slice(0, 10),
    owner_amount: numericAmount,
    notes: description,
    status: status || 'paid',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
