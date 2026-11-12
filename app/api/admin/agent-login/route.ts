export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as db } from '@/lib/admin-auth'

// Staff create (or reset) an agent's portal login from Partners → Agent Programme → Agents.
// POST { agent_id, email, password } → creates the login (or sets a new password if one exists) and activates the agent.
export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const password = String(b.password ?? '')
  const email = String(b.email ?? '').trim().toLowerCase()
  if (password.length < 8) return NextResponse.json({ error: 'Choose a password of at least 8 characters.' }, { status: 400 })
  const { data: agent } = await db.from('partner_agents').select('id,user_id,name,email,portal_user_id').eq('id', b.agent_id).maybeSingle()
  if (!agent || agent.user_id !== staff.businessId) return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })

  if (agent.portal_user_id) {
    const { error } = await db.auth.admin.updateUserById(agent.portal_user_id, { password })
    if (error) return NextResponse.json({ error: 'Could not reset the password.' }, { status: 500 })
    return NextResponse.json({ ok: true, created: false })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Add the agent’s email address first.' }, { status: 400 })
  const { data: u, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: agent.name, role: 'agent' } })
  if (error || !u?.user) {
    const exists = /already|registered|exists/i.test(error?.message || '')
    return NextResponse.json({ error: exists ? 'An account with this email already exists.' : 'Could not create the login.' }, { status: exists ? 409 : 500 })
  }
  const { error: ue } = await db.from('partner_agents').update({ portal_user_id: u.user.id, email, status: 'active' }).eq('id', agent.id)
  if (ue) { await db.auth.admin.deleteUser(u.user.id).catch(() => {}); return NextResponse.json({ error: 'Could not link the login.' }, { status: 500 }) }
  return NextResponse.json({ ok: true, created: true })
}
