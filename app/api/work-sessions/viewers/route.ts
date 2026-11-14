import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceClient } from '@/lib/admin-auth'

// Only the account owner chooses which staff can see Work Hours.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c || c.uid !== c.businessId) return NextResponse.json({ error: 'Only the account owner can do this' }, { status: 403 })
  const [{ data: v }, { data: t }] = await Promise.all([
    serviceClient.from('work_hours_viewers').select('email').eq('business_id', c.businessId),
    serviceClient.from('team_members').select('name,email').eq('user_id', c.businessId).order('name'),
  ])
  return NextResponse.json({ viewers: (v ?? []).map((x: any) => x.email), team: (t ?? []).filter((x: any) => x.email) })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c || c.uid !== c.businessId) return NextResponse.json({ error: 'Only the account owner can do this' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const emails: string[] = Array.from(new Set((Array.isArray(b.viewers) ? b.viewers : []).map((x: any) => String(x).toLowerCase().trim()).filter(Boolean)))
  await serviceClient.from('work_hours_viewers').delete().eq('business_id', c.businessId)
  if (emails.length) await serviceClient.from('work_hours_viewers').insert(emails.map(email => ({ business_id: c.businessId, email })))
  return NextResponse.json({ ok: true })
}
