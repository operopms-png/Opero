export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { viewerFor, issuesFor, type Role } from '@/lib/maintenance-feed'

// The Maintenance tab of the tenant, landlord and partner portals.
//   GET ?role=tenant|landlord|partner            the signed-in person's own tab
//   GET ?role=…&target=<id>                      staff previewing a person's portal (tenant id, landlord id or partner id)
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get('role') as Role
  if (!['tenant', 'landlord', 'partner'].includes(role)) return bad('Unknown portal')
  const target = req.nextUrl.searchParams.get('target') || ''
  let v
  if (target) {
    const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
    v = await viewerFor(role, { target, businessId: c.businessId })
  } else {
    const uid = await requireUser(req); if (!uid) return bad('Not signed in', 401)
    v = await viewerFor(role, { uid })
  }
  if (!v) return NextResponse.json({ issues: [], role })
  return NextResponse.json({ issues: await issuesFor(v), role })
}
