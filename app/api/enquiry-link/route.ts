export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { SITE_URL } from '@/lib/brand'

// GET → { url, active }   staff get their company's enquiry-form link (created the first time)
// POST { active }         admins switch the link on or off
export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  let { data } = await db.from('enquiry_links').select('token,active').eq('business_id', c.businessId).maybeSingle()
  if (!data) { const r = await db.from('enquiry_links').insert({ business_id: c.businessId }).select('token,active').single(); data = r.data }
  if (!data) return NextResponse.json({ error: 'Could not create the link.' }, { status: 500 })
  return NextResponse.json({ url: `${SITE_URL}/enquire/${data.token}`, careersUrl: `${SITE_URL}/careers/${data.token}`, agentUrl: `${SITE_URL}/agent-signup/${data.token}`, active: data.active, isAdmin: c.isAdmin })
}
export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an admin can switch the link on or off.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  await db.from('enquiry_links').update({ active: !!b.active }).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
