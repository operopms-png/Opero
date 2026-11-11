export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// What the AI read from a tenant's uploaded check documents, for staff to review in Compliance → Tenant Checks.
//   GET ?tenant_id=…            → { reads: newest first, one per category kept }
//   POST {id, status:'used'|'dismissed'|'review'}
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental|estate/i.test(c.role || '')

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const tid = req.nextUrl.searchParams.get('tenant_id') || ''
  if (!/^[0-9a-f-]{36}$/.test(tid)) return bad('Choose a tenant.')
  const { data } = await db.from('tenant_check_reads').select('id, category, file_name, extracted, status, created_at').eq('business_id', c.businessId).eq('tenant_id', tid).neq('status', 'dismissed').order('created_at', { ascending: false }).limit(20)
  const seen = new Set<string>(), reads: any[] = []
  for (const r of data ?? []) { if (seen.has(r.category)) continue; seen.add(r.category); reads.push(r) }
  return NextResponse.json({ reads })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const b = await req.json().catch(() => ({}))
  if (!/^[0-9a-f-]{36}$/.test(String(b.id || '')) || !['used', 'dismissed', 'review'].includes(b.status)) return bad('Could not update that.')
  await db.from('tenant_check_reads').update({ status: b.status }).eq('id', b.id).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
