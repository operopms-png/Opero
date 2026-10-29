import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Invoices and Approvals counts for the account (business_id scoped).
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const [inv, appr] = await Promise.all([
    db.from('invoices').select('status,due_date,paid_at,total,currency').eq('business_id', biz),
    db.from('approvals').select('status,amount,currency').eq('business_id', biz),
  ])
  const invoices = (inv.data ?? []) as any[]
  const unpaid = invoices.filter(i => !i.paid_at && !/paid|cancel|void|draft/i.test(i.status || ''))
  const approvals = (appr.data ?? []) as any[]
  const pending = approvals.filter(a => a.status === 'pending')
  return NextResponse.json({
    invoices: {
      unpaid: unpaid.length,
      overdue: unpaid.filter(i => i.due_date && i.due_date < today).length,
      unpaidGBP: Math.round(unpaid.filter(i => i.currency === 'GBP').reduce((a, i) => a + (Number(i.total) || 0), 0)),
    },
    approvals: {
      pending: pending.length,
      pendingGBP: Math.round(pending.filter(a => a.currency === 'GBP').reduce((a, x) => a + (Number(x.amount) || 0), 0)),
    },
  })
}
