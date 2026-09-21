import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireStaffWithBusiness } from '@/lib/admin-auth'
import { voiceIdentityFor } from '@/lib/voice-identity'

export async function POST(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connection_id, to, contact_id, contact_name } = await req.json()
  if (!to) return NextResponse.json({ error: 'to is required' }, { status: 400 })

  let staffName: string | null = null
  const { data: member } = await serviceClient.from('team_members').select('name').eq('email', auth.email ?? '').maybeSingle()
  staffName = member?.name ?? null

  const { data, error } = await serviceClient.from('call_logs').insert({
    user_id: auth.businessId,
    connection_id: connection_id ?? null,
    direction: 'outbound',
    contact_phone: to,
    contact_name: contact_name ?? null,
    contact_id: contact_id ?? null,
    staff_identity: voiceIdentityFor(auth.staffId),
    staff_name: staffName,
    status: 'in-progress',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, duration_seconds } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await serviceClient.from('call_logs')
    .update({ status: status ?? 'completed', duration_seconds: duration_seconds ?? null })
    .eq('id', id)
    .eq('user_id', auth.businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contactPhone = req.nextUrl.searchParams.get('contact_phone')
  let query = serviceClient.from('call_logs').select('*').eq('user_id', auth.businessId).order('created_at', { ascending: false })
  if (contactPhone) query = query.eq('contact_phone', contactPhone)
  const { data, error } = await query.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calls: data ?? [] })
}
