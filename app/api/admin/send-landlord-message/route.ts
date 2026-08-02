import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, serviceClient } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const staffId = await requireStaff(req)
  if (!staffId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { landlord_id, message, attachment_url } = await req.json()
  if (!landlord_id || (!message?.trim() && !attachment_url)) return NextResponse.json({ error: 'landlord_id and message or attachment are required' }, { status: 400 })

  const { error } = await serviceClient.from('pm_landlord_messages').insert({
    landlord_id,
    sender: 'staff',
    message: message?.trim() || '',
    attachment_url: attachment_url || null,
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
