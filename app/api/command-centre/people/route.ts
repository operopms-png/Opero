import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Investors, Partners and Owners counts, from the account's own records.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const [inv, pay, agents, refs, signups, pmL, eaL] = await Promise.all([
    db.from('dev_investors').select('status,investment_amount').eq('user_id', biz),
    db.from('dev_investor_payments').select('amount').eq('user_id', biz),
    db.from('partner_agents').select('status').eq('user_id', biz),
    db.from('agent_referrals').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('partner_signups').select('id').eq('business_id', biz).eq('status', 'pending'),
    db.from('pm_landlords').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('estate_landlords').select('id', { count: 'exact', head: true }).eq('user_id', biz),
  ])
  const investors = (inv.data ?? []) as any[]
  const ag = (agents.data ?? []) as any[]
  return NextResponse.json({
    investors: {
      total: investors.length,
      active: investors.filter(i => String(i.status || '').toLowerCase() === 'active').length,
      invested: Math.round(investors.reduce((s, i) => s + (Number(i.investment_amount) || 0), 0)),
      paidBack: Math.round(((pay.data ?? []) as any[]).reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    },
    partners: {
      active: ag.filter(a => String(a.status || '').toLowerCase() === 'active').length,
      referrals: refs.count ?? 0,
      awaitingPayment: (signups.data ?? []).length,
    },
    owners: { count: (pmL.count ?? 0) + (eaL.count ?? 0) },
  })
}
