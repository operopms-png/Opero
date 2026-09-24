import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'

// Public -- this is the endpoint the /meet/<token> booking page itself
// calls, before the attendee is signed in to anything, so it's
// deliberately unauthenticated. It only ever exposes what's needed to
// book (title, duration, status), never the business's user_id or any
// other account data.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { data, error } = await serviceClient
    .from('meetings')
    .select('title,duration_minutes,status,scheduled_at,attendee_name')
    .eq('token', params.token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'This meeting link is invalid.' }, { status: 404 })
  return NextResponse.json({ meeting: data })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { attendee_name, attendee_email, scheduled_at, notes } = await req.json()
  if (!attendee_name || !attendee_email || !scheduled_at) {
    return NextResponse.json({ error: 'Name, email, and a time are required' }, { status: 400 })
  }

  const { data: meeting } = await serviceClient.from('meetings').select('id,status').eq('token', params.token).maybeSingle()
  if (!meeting) return NextResponse.json({ error: 'This meeting link is invalid.' }, { status: 404 })
  if (meeting.status === 'cancelled') return NextResponse.json({ error: 'This meeting link has been cancelled.' }, { status: 409 })
  if (meeting.status === 'scheduled') return NextResponse.json({ error: 'This link has already been booked.' }, { status: 409 })

  const { error } = await serviceClient
    .from('meetings')
    .update({ attendee_name, attendee_email, scheduled_at, notes: notes || null, status: 'scheduled' })
    .eq('id', meeting.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
