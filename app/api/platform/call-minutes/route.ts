import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner } from '@/lib/platform-owner-auth'
import { companyCode, monthUsageByCompany, DAILY_COST_PER_MIN } from '@/lib/call-usage'

// Platform Owner → Revenue and Customers: monthly group/video call allowance per client company, and what
// each has used this month (read from Daily). Owner login only. 0 or empty = calls off for that company.
export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { data } = await db.from('subscriptions').select('user_id, call_minutes_limit')
  let usage: Record<string, number> = {}, error: string | null = null
  if (!process.env.DAILY_API_KEY) error = 'DAILY_API_KEY is not set in Netlify, so usage cannot be read.'
  else { try { usage = await monthUsageByCompany() } catch (e: any) { error = e?.message || 'Could not read usage from Daily' } }
  const companies: Record<string, { limit: number; used: number; cost: number }> = {}
  for (const r of data ?? []) {
    const used = Math.round(usage[companyCode(r.user_id)] || 0)
    companies[r.user_id] = { limit: Number(r.call_minutes_limit) || 0, used, cost: used * DAILY_COST_PER_MIN }
  }
  return NextResponse.json({ companies, error, rate: DAILY_COST_PER_MIN })
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { user_id, limit } = await req.json().catch(() => ({}))
  const n = Math.max(0, Math.min(100000, Math.floor(Number(limit) || 0)))
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  const { error } = await db.from('subscriptions').update({ call_minutes_limit: n }).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, limit: n })
}
