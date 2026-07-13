import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, amount, description, category, type } = await req.json()
  if (!owner_id || !amount) return NextResponse.json({ error: 'owner_id and amount are required' }, { status: 400 })

  const amt = type === 'expense' ? -Math.abs(Number(amount)) : Math.abs(Number(amount))

  const { error } = await serviceClient.from('owner_finance').insert({
    owner_id,
    amount: amt,
    description,
    category,
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
