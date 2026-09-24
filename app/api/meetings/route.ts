import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient, requireStaffWithBusiness } from '@/lib/admin-auth'

// Meeting-scheduling links: a staff member picks a duration (15/30/60
// min) and we hand back a one-time link at /meet/<token>. Whoever opens
// it books a time, which locks in scheduled_at -- the duration itself
// was fixed the moment the link was created, so a "15 min" link is
// always a 15 min meeting no matter when it's booked.
export async function GET(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await serviceClient
    .from('meetings')
    .select('*')
    .eq('user_id', auth.businessId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meetings: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, duration_minutes } = await req.json()
  if (![15, 30, 60].includes(Number(duration_minutes))) {
    return NextResponse.json({ error: 'duration_minutes must be 15, 30, or 60' }, { status: 400 })
  }

  const token = randomBytes(12).toString('base64url')
  const { data, error } = await serviceClient
    .from('meetings')
    .insert({
      user_id: auth.businessId,
      created_by_email: auth.email,
      title: title?.trim() || `${duration_minutes} min meeting`,
      duration_minutes: Number(duration_minutes),
      token,
      status: 'pending',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meeting: data })
}

// Cancel a meeting link (staff-side) -- keeps the row (and whatever got
// booked on it) instead of deleting, so it still shows in the list with
// a clear "Cancelled" status rather than just disappearing.
export async function PATCH(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !['cancelled', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
  }

  const { data: existing } = await serviceClient.from('meetings').select('id').eq('id', id).eq('user_id', auth.businessId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const { error } = await serviceClient.from('meetings').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
