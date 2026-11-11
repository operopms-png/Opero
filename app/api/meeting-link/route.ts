import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'

// Returns this company's own booking-link code, creating its booking page the first time.
// Requests sent through /meeting?code=<code> land in that company's own Meetings board.
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data: existing } = await serviceClient.from('meeting_booking_pages').select('code').eq('business_id', who.businessId).limit(1)
  if (existing?.[0]?.code) return NextResponse.json({ code: existing[0].code })
  const { data: cs } = await serviceClient.from('invoice_settings').select('company_name').eq('business_id', who.businessId).maybeSingle()
  const name = (cs?.company_name as string | undefined)?.trim()
  const code = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').toLowerCase()
  const { error } = await serviceClient.from('meeting_booking_pages').insert({ business_id: who.businessId, code, heading: name ? `Book a meeting with ${name}` : 'Book a meeting with us' })
  if (error) return NextResponse.json({ error: 'Could not create your booking link.' }, { status: 500 })
  return NextResponse.json({ code })
}
