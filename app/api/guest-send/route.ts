import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { sendGuestMessage } from '@/lib/ai-guest-receptionist'

// Thin wrapper -- the actual send logic (Smoobu vs email routing,
// message logging) lives in sendGuestMessage(), shared with the AI
// auto-reply path so both go through identical, tested logic.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Staff send on behalf of the business account (its Smoobu connection)
  const userId = caller.businessId

  const json = await req.json()
  const { booking_id, subject } = json
  const body: string = json.body ?? json.message
  if (!booking_id || !body?.trim()) {
    return NextResponse.json({ error: 'booking_id and body are required' }, { status: 400 })
  }

  const result = await sendGuestMessage(userId, booking_id, subject, body, 'staff')
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })
  return NextResponse.json({ success: true })
}
