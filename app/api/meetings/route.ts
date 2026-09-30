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

// Update a meeting link (staff-side): cancel / re-open it, rename it, change the
// length while nobody has booked yet, or edit notes. Cancelling keeps the row (and
// whatever got booked on it) so it still shows with a clear "Cancelled" status.
export async function PATCH(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: existing } = await serviceClient.from('meetings').select('id,status').eq('id', id).eq('user_id', auth.businessId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const patch: Record<string, any> = {}
  if ('status' in body) {
    if (!['cancelled', 'pending'].includes(body.status)) return NextResponse.json({ error: 'A meeting can only be cancelled or re-opened here — it becomes "Booked" when someone picks a time.' }, { status: 400 })
    patch.status = body.status
  }
  if ('title' in body) patch.title = String(body.title ?? '').trim().slice(0, 200) || 'Meeting'
  if ('notes' in body) patch.notes = body.notes ? String(body.notes).slice(0, 5000) : null
  if ('duration_minutes' in body) {
    if (![15, 30, 60].includes(Number(body.duration_minutes))) return NextResponse.json({ error: 'Length must be 15, 30 or 60 minutes' }, { status: 400 })
    if (existing.status === 'scheduled') return NextResponse.json({ error: 'This meeting is already booked, so its length can’t change.' }, { status: 400 })
    patch.duration_minutes = Number(body.duration_minutes)
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await serviceClient.from('meetings').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ids } = await req.json()
  if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'ids are required' }, { status: 400 })
  const { error } = await serviceClient.from('meetings').delete().in('id', ids).eq('user_id', auth.businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
