export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { CURRENCIES } from '@/lib/company-currency'

// The company's currency symbol for Real Estate Intelligence.
//   GET → { symbol, chosen }     POST {symbol} → admin only
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { data } = await db.from('invoice_settings').select('currency_symbol, currency_chosen').eq('business_id', c.businessId).maybeSingle()
  return NextResponse.json({ symbol: data?.currency_symbol || '£', chosen: !!data?.currency_chosen })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!c.isAdmin) return bad('Only an admin can change the currency.', 403)
  const { symbol } = await req.json().catch(() => ({}))
  if (!CURRENCIES.some(x => x.symbol === symbol)) return bad('Choose a currency from the list.')
  const { data: ex } = await db.from('invoice_settings').select('business_id').eq('business_id', c.businessId).maybeSingle()
  const { error } = ex ? await db.from('invoice_settings').update({ currency_symbol: symbol, currency_chosen: true }).eq('business_id', c.businessId) : await db.from('invoice_settings').insert({ business_id: c.businessId, currency_symbol: symbol, currency_chosen: true })
  if (error) return bad('Could not save that. Try again.', 500)
  return NextResponse.json({ ok: true, symbol })
}
