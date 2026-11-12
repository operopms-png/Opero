export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as db } from '@/lib/admin-auth'

// Staff dashboard: the agent leaderboard, ranked by confirmed commission (paid, payable and pending).
// Returns the full staff view (names and amounts); the dashboard also draws the agents' view (no amounts) from the same list.
export async function GET(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: agents } = await db.from('partner_agents').select('id,name,code,status').eq('user_id', staff.businessId).eq('status', 'active')
  const { data: refs } = await db.from('agent_referrals').select('agent_id,commission_amount,commission_status').eq('user_id', staff.businessId)
  const rows = (agents ?? []).map(a => {
    const mine = (refs ?? []).filter(r => r.agent_id === a.id)
    const sum = (st: string[]) => mine.filter(r => st.includes(r.commission_status)).reduce((s, r) => s + (Number(r.commission_amount) || 0), 0)
    return { id: a.id, name: a.name as string, code: a.code as string, referrals: mine.length, paid: sum(['paid']), owed: sum(['payable']), pending: sum(['pending']) }
  }).map(r => ({ ...r, total: r.paid + r.owed + r.pending })).sort((x, y) => y.total - x.total || y.referrals - x.referrals)
  return NextResponse.json({ agents: rows.slice(0, 10) })
}
