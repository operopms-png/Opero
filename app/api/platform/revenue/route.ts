import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner, clientLabels } from '@/lib/platform-owner-auth'

// Platform Owner → Revenue and Customers: Novourq's own income and customers, across every client.
// Owner login only. Money figures are worked out from the subscriptions table and the plan prices below;
// they are an estimate of Stripe, not a replacement for it.
const MONTHLY_PRICE = 49        // £ per month, recurring plan
const ONETIME_PRICE = 470.4     // £ per year, annual plan (£588 less 20%)
const LIFETIME_PRICE = 175.5    // £ one-off lifetime plan, first 10 clients

type Kind = 'monthly' | 'yearly' | 'trial' | 'onetime' | 'complimentary' | 'cancelled' | 'failing'

export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { data } = await db.from('subscriptions').select('user_id, plan, billing_period, status, stripe_customer_id, stripe_subscription_id, trial_end, created_at, updated_at').order('created_at', { ascending: false })
  const rows = data ?? []
  const labels = await clientLabels(rows.map((r: any) => r.user_id))
  const now = Date.now()

  const customers = rows.map((r: any) => {
    const st = String(r.status || '').toLowerCase()
    const period = String(r.billing_period || '').toLowerCase()
    const oneTime = ['onetime', 'one-time', 'lifetime', 'one_time'].includes(period)
    let kind: Kind
    if (st === 'canceled' || st === 'cancelled' || st === 'incomplete_expired') kind = 'cancelled'
    else if (['past_due', 'unpaid', 'paused'].includes(st)) kind = 'failing'
    else if (oneTime && r.stripe_customer_id) kind = 'onetime'
    else if (st === 'trialing' || (r.trial_end && new Date(r.trial_end).getTime() > now)) kind = 'trial'
    else if (!r.stripe_customer_id && !r.stripe_subscription_id) kind = 'complimentary'
    else if (period === 'yearly') kind = 'yearly'
    else kind = 'monthly'
    return {
      id: r.user_id, name: labels[r.user_id]?.name, email: labels[r.user_id]?.email, kind, plan: r.plan, period: r.billing_period,
      status: r.status, trial_end: r.trial_end, since: r.created_at, changed: r.updated_at,
    }
  })

  const count = (k: Kind) => customers.filter(c => c.kind === k).length
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const d30 = now - 30 * 864e5
  const summary = {
    mrr: count('monthly') * MONTHLY_PRICE + count('yearly') * ONETIME_PRICE / 12,
    yearly: count('yearly'),
    monthly: count('monthly'), trial: count('trial'), onetime: count('onetime'), complimentary: count('complimentary'),
    failing: count('failing'), cancelled: count('cancelled'),
    oneTimeRevenue: count('onetime') * LIFETIME_PRICE,
    newThisMonth: customers.filter(c => new Date(c.since).getTime() >= monthStart.getTime() && c.kind !== 'complimentary').length,
    cancelledLast30: customers.filter(c => c.kind === 'cancelled' && new Date(c.changed).getTime() >= d30).length,
    prices: { monthly: MONTHLY_PRICE, onetime: LIFETIME_PRICE },
  }
  return NextResponse.json({ summary, customers })
}
