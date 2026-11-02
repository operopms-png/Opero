import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// Daily briefing: what needs a person today, across every module the business uses.
// Plain counts from the records, most urgent first. Nothing here is written by an AI, so
// every number can be checked against the tab it links to.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Item = { key: string; label: string; count: number; detail?: string; href: string; level: 'urgent' | 'soon' | 'info' }
const day = (o = 0) => new Date(Date.now() + o * 86400000).toISOString().slice(0, 10)
const rows = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => (r.data ?? []) as any[]).catch(() => [] as any[])
const open = (s: any) => !/paid|clos|resolv|complet|done|cancel/i.test(String(s ?? ''))

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const biz = c.businessId, today = day(), in30 = day(30), in60 = day(60)

  const props = await rows(db.from('properties').select('id').eq('user_id', biz))
  const propIds = props.map(p => p.id)

  const [budgetLines, projects, oldSnags, approvals, rent, pmComp, eaComp, devComp, pmLeases, eaLeases, pmMaint, strMaint, checkins, cleans, viewings, snags] = await Promise.all([
    rows(db.from('dev_budget_items').select('budgeted, actual').eq('user_id', biz)),
    rows(db.from('dev_projects').select('status, end_date').eq('user_id', biz)),
    rows(db.from('dev_snagging').select('status, reported_date').eq('user_id', biz).lt('reported_date', day(-7))),
    rows(db.from('ai_pending_actions').select('id').eq('user_id', biz).in('status', ['pending', 'failed'])),
    rows(db.from('pm_rent_payments').select('status, due_date').eq('user_id', biz).lt('due_date', today)),
    rows(db.from('pm_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', in30)),
    rows(db.from('estate_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', in30)),
    rows(db.from('dev_compliance').select('expiry_date').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', in30)),
    rows(db.from('pm_leases').select('end_date, status').eq('user_id', biz).gte('end_date', today).lte('end_date', in60)),
    rows(db.from('estate_tenancies').select('end_date, status').eq('user_id', biz).gte('end_date', today).lte('end_date', in60)),
    rows(db.from('pm_maintenance').select('status').eq('user_id', biz)),
    rows(db.from('maintenance_tickets').select('status').eq('user_id', biz)),
    propIds.length ? rows(db.from('bookings').select('check_in, status').in('property_id', propIds).in('check_in', [today, day(1)])) : [],
    rows(db.from('cleaning_tasks').select('status, scheduled_date').eq('user_id', biz).lte('scheduled_date', today)),
    rows(db.from('estate_viewings').select('scheduled_at, status').eq('user_id', biz).gte('scheduled_at', today).lt('scheduled_at', day(1))),
    rows(db.from('dev_snagging').select('status, priority').eq('user_id', biz)),
  ])

  const overdue = rent.filter(r => String(r.status).toLowerCase() !== 'paid')
  const expired = [...pmComp, ...eaComp, ...devComp].filter(r => r.expiry_date < today)
  const expiring = [...pmComp, ...eaComp, ...devComp].filter(r => r.expiry_date >= today)
  const ending = [...pmLeases, ...eaLeases].filter(l => !/end|terminat|expir|cancel/i.test(String(l.status ?? '')))
  const maint = [...pmMaint, ...strMaint].filter(m => open(m.status))
  const arrivals = checkins.filter(b => b.status !== 'cancelled')
  const pendingCleans = cleans.filter(t => String(t.status).toLowerCase() === 'pending')
  const bookedViewings = viewings.filter(v => !/cancel|complete|no.?show/i.test(String(v.status ?? '')))
  const openSnags = snags.filter(s => open(s.status))
  const urgentSnags = openSnags.filter(s => /high|urgent|critical/i.test(String(s.priority ?? '')))

  const overBudget = budgetLines.filter(b => Number(b.budgeted) > 0 && Number(b.actual) > Number(b.budgeted) * 1.1)
  const lateProjects = projects.filter(p => p.end_date && p.end_date < today && !/complet|clos|done|sold/i.test(String(p.status ?? '')))
  const staleSnags = oldSnags.filter(s => open(s.status))
  const all: Item[] = [
    { key: 'approvals', label: 'AI drafts waiting for your approval', count: approvals.length, href: '/staff-centre/ai-command-centre/approvals', level: 'urgent' },
    { key: 'arrears', label: 'Overdue rent payments', count: overdue.length, href: '/pm', level: 'urgent' },
    { key: 'expired', label: 'Compliance certificates expired', count: expired.length, href: '/staff-centre/compliance', level: 'urgent' },
    { key: 'snags', label: 'High-priority snagging items open', count: urgentSnags.length, href: '/dev', level: 'urgent' },
    { key: 'overbudget', label: 'Budget lines more than 10% over budget', count: overBudget.length, href: '/dev', level: 'urgent' },
    { key: 'lateprojects', label: 'Projects past their target end date', count: lateProjects.length, href: '/dev', level: 'soon' },
    { key: 'stalesnags', label: 'Snagging items open more than 7 days', count: staleSnags.length, href: '/dev', level: 'soon' },
    { key: 'expiring', label: 'Certificates expiring within 30 days', count: expiring.length, href: '/staff-centre/compliance', level: 'soon' },
    { key: 'leases', label: 'Tenancies ending within 60 days', count: ending.length, href: '/pm', level: 'soon' },
    { key: 'maint', label: 'Open maintenance jobs', count: maint.length, href: '/pm', level: 'soon' },
    { key: 'arrivals', label: 'Guest check-ins today or tomorrow', count: arrivals.length, href: '/str', level: 'info' },
    { key: 'cleans', label: 'Cleans due or overdue', count: pendingCleans.length, href: '/str', level: 'soon' },
    { key: 'viewings', label: 'Viewings booked today', count: bookedViewings.length, href: '/estate', level: 'info' },
  ]
  const items = all.filter(i => i.count > 0)

  const rank = { urgent: 0, soon: 1, info: 2 }
  items.sort((a, b) => rank[a.level] - rank[b.level])
  return NextResponse.json({ date: today, items })
}
