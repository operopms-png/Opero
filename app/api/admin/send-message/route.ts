import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, message } = await req.json()
  if (!owner_id || !message?.trim()) return NextResponse.json({ error: 'owner_id and message are required' }, { status: 400 })

  const { error } = await serviceClient.from('owner_messages').insert({
    owner_id,
    sender: 'staff',
    message: message.trim(),
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
