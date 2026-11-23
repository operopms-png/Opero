export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { viewerFor, type Role } from '@/lib/maintenance-feed'
import { noticesFor } from '@/lib/building-notices'

// Notices at the top of the Maintenance tab in the tenant, landlord and partner portals (same rules as /api/maintenance-portal).
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
  if (!v) return NextResponse.json({ notices: [] })
  return NextResponse.json({ notices: await noticesFor(v) })
}
