import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'
import { sendGuestMessage } from '@/lib/ai-guest-receptionist'

// Thin wrapper -- the actual send logic (Smoobu vs email routing,
// message logging) lives in sendGuestMessage(), shared with the AI
// auto-reply path so both go through identical, tested logic.
export async function POST(req: NextRequest) {
  const userId = await requireUser(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, subject, body } = await req.json()
  if (!booking_id || !body?.trim()) {
    return NextResponse.json({ error: 'booking_id and body are required' }, { status: 400 })
  }

  const result = await sendGuestMessage(userId, booking_id, subject, body, 'staff')
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ success: true })
}
