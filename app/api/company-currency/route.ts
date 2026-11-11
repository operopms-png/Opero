export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { CURRENCIES } from '@/lib/company-currency'
import { isTz, DEFAULT_TZ } from '@/lib/company-tz'

// The company's currency symbol for Real Estate Intelligence.
//   GET → { symbol, chosen }     POST {symbol} → admin only
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { data } = await db.from('invoice_settings').select('currency_symbol, currency_chosen, timezone').eq('business_id', c.businessId).maybeSingle()
  return NextResponse.json({ symbol: data?.currency_symbol || '£', chosen: !!data?.currency_chosen, timezone: (data as any)?.timezone || DEFAULT_TZ })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!c.isAdmin) return bad('Only an admin can change the currency.', 403)
  const { symbol, timezone } = await req.json().catch(() => ({}))
  const tzv = isTz(timezone) ? timezone : null
  if (!CURRENCIES.some(x => x.symbol === symbol)) return bad('Choose a currency from the list.')
  const { data: ex } = await db.from('invoice_settings').select('business_id').eq('business_id', c.businessId).maybeSingle()
  const { error } = ex ? await db.from('invoice_settings').update({ currency_symbol: symbol, currency_chosen: true, ...(tzv ? { timezone: tzv } : {}) }).eq('business_id', c.businessId) : await db.from('invoice_settings').insert({ business_id: c.businessId, currency_symbol: symbol, currency_chosen: true, ...(tzv ? { timezone: tzv } : {}) })
  if (error) return bad('Could not save that. Try again.', 500)
  return NextResponse.json({ ok: true, symbol })
}
