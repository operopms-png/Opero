export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'

// The £175.50 lifetime offer is limited to the first 10 clients. Public: the sign-up page shows how many places are left.
export const LIFETIME_LIMIT = 10

export async function GET() {
  const { count } = await db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('billing_period', 'lifetime')
  return NextResponse.json({ left: Math.max(0, LIFETIME_LIMIT - (count ?? 0)), limit: LIFETIME_LIMIT }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
