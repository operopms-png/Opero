export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { RATE_KEYS } from '@/lib/jamaica-costs'

// Deal Analyser → Jamaica real estate charges. Each company keeps its own default rates.
//   GET                   -> { rates }  this company's saved defaults (empty means the standard rates)
//   POST { rates }        -> save the defaults (admins only); an empty object resets to the standard rates
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { data } = await db.from('jamaica_cost_rates').select('rates').eq('business_id', c.businessId).maybeSingle()
  return NextResponse.json({ rates: data?.rates ?? {}, canEdit: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Only an admin can change the company rates.', 403)
  const b = await req.json().catch(() => ({}))
  const clean: Record<string, number> = {}
  for (const k of RATE_KEYS) {
    const v = b.rates?.[k]
    if (v === '' || v == null || isNaN(Number(v))) continue
    clean[k] = Math.min(100000000, Math.max(0, Number(v)))
  }
  const { error } = await db.from('jamaica_cost_rates').upsert({ business_id: c.businessId, rates: clean, updated_by: c.email, updated_at: new Date().toISOString() }, { onConflict: 'business_id' })
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true, rates: clean })
}
