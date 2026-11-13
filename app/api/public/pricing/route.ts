export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'

// Public pricing for the website. Every figure is read live from the Stripe prices that checkout uses
// (STRIPE_PRICE_NOVOURQ_MONTHLY / _ONETIME / _LIFETIME), so the website can never show a price Stripe does not charge.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=120' }
export async function OPTIONS() { return new NextResponse(null, { status: 200, headers: CORS }) }

export async function GET() {
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe((process.env.STRIPE_NOVOURQ_SECRET_KEY || process.env.STRIPE_SECRET_KEY)!, { apiVersion: '2026-05-27.dahlia' })
    const ids: [string, string | undefined][] = [['monthly', process.env.STRIPE_PRICE_NOVOURQ_MONTHLY], ['onetime', process.env.STRIPE_PRICE_NOVOURQ_ONETIME], ['lifetime', process.env.STRIPE_PRICE_NOVOURQ_LIFETIME]]
    const plans: any[] = []
    for (const [key, id] of ids) {
      if (!id) continue
      const p = await stripe.prices.retrieve(id).catch(() => null)
      if (!p || !p.active || p.unit_amount == null) continue
      plans.push({ key, amount: p.unit_amount / 100, currency: p.currency.toUpperCase(), recurring: p.type === 'recurring', interval: p.recurring?.interval ?? null })
    }
    const monthly = plans.find(p => p.key === 'monthly')
    const out = plans.map(p => ({ ...p, was: p.key === 'onetime' && monthly && p.amount < monthly.amount * 12 ? monthly.amount * 12 : null }))
    // The lifetime offer is limited; hide it once the places are gone.
    const life = out.find(p => p.key === 'lifetime')
    let left: number | null = null
    if (life) {
      const { count } = await db.from('subscriptions').select('user_id', { count: 'exact', head: true }).eq('billing_period', 'lifetime')
      left = Math.max(0, 10 - (count ?? 0))
    }
    return NextResponse.json({ plans: out.filter(p => p.key !== 'lifetime' || (left ?? 0) > 0), lifetimeLeft: left }, { headers: CORS })
  } catch {
    return NextResponse.json({ plans: [] }, { status: 500, headers: CORS })
  }
}
