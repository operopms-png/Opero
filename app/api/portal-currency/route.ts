export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { portalIdentity, loadMyData } from '@/lib/my-data'
import { companySymbol } from '@/lib/company-currency-server'

// The currency symbol of the company a landlord or tenant belongs to, for their portal. { symbol: null } when the person is not a landlord or tenant.
export async function GET(req: NextRequest) {
  const me = await portalIdentity(req)
  if (!me) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const d = await loadMyData(me.uid, me.email)
  if (!d.businessId) return NextResponse.json({ symbol: null })
  return NextResponse.json({ symbol: await companySymbol(d.businessId) })
}
