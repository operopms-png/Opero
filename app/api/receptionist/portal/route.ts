import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { handleLatestFor, PortalKind } from '@/lib/receptionist'

// Called by the tenant/landlord portals right after someone sends a message,
// so the AI receptionist can answer straight away (if it's switched on).
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { kind, person_id } = await req.json().catch(() => ({}))
  if (!kind || !person_id) return NextResponse.json({ error: 'kind and person_id are required' }, { status: 400 })
  const r = await handleLatestFor(kind as PortalKind, person_id, c.uid, c.businessId).catch((e: any) => ({ error: String(e?.message ?? e) }))
  return NextResponse.json(r)
}
