import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Finance → Approvals. Any staff member can ask for something to be signed off
// (an expense, refund, discount, purchase…); admins approve or reject it.
// Approved amounts count as money out on Finance → Overview.
//   GET                                   -> { requests, isAdmin }   (staff see their own, admins see all)
//   POST {action:'create', kind,title,details?,amount?,currency?,module?,property?,receipt_url?}
//   POST {action:'decide', id, status:'approved'|'rejected', note?}   (admins)
//   POST {action:'cancel', id}            (the person who asked, while pending)

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const KINDS = ['expense', 'refund', 'discount', 'purchase', 'other']
const CURS = ['GBP', 'JMD', 'USD']

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  let qy = db.from('approvals').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(300)
  if (!c.isAdmin) qy = qy.eq('requested_email', c.email)
  const { data, error } = await qy
  if (error) return bad(error.message, 500)
  return NextResponse.json({ requests: data ?? [], isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  if (b.action === 'create') {
    const title = String(b.title || '').trim().slice(0, 200)
    if (!title) return bad('Say what it’s for.')
    const amount = b.amount === '' || b.amount == null ? null : Number(String(b.amount).replace(/[^0-9.]/g, ''))
    const row = {
      business_id: c.businessId, kind: KINDS.includes(b.kind) ? b.kind : 'expense', title, details: String(b.details || '').slice(0, 2000) || null,
      amount: Number.isFinite(amount as number) ? amount : null, currency: CURS.includes(b.currency) ? b.currency : 'JMD',
      module: ['vr', 'pm', 'ea', 'dev', 'company'].includes(b.module) ? b.module : 'company', property: String(b.property || '').slice(0, 200) || null,
      receipt_url: typeof b.receipt_url === 'string' && /^https?:\/\//.test(b.receipt_url) ? b.receipt_url : null,
      requested_by: c.name || c.email, requested_email: c.email,
    }
    const { data, error } = await db.from('approvals').insert(row).select('*').single()
    if (error) return bad(error.message, 500)
    const amt = row.amount != null ? ` · ${({ GBP: '£', JMD: 'J$', USD: '$' } as any)[row.currency]}${Number(row.amount).toLocaleString('en-GB')}` : ''
    await db.from('notifications').insert({ user_id: c.businessId, title: `Approval needed: ${title}${amt}`.slice(0, 300), message: `${row.requested_by} asked for sign-off.`, type: 'approval', module: 'staffcentre', link: '/staff-centre/approvals', read: false })
    return NextResponse.json({ request: data })
  }
  const { data: r } = await db.from('approvals').select('*').eq('id', String(b.id || '')).eq('business_id', c.businessId).maybeSingle()
  if (!r) return bad('Request not found', 404)
  if (b.action === 'decide') {
    if (!c.isAdmin) return bad('Only admins can approve.', 403)
    if (!['approved', 'rejected'].includes(b.status)) return bad('Choose approve or reject.')
    const { data, error } = await db.from('approvals').update({ status: b.status, decided_by: c.name || c.email, decided_at: new Date().toISOString(), decision_note: String(b.note || '').slice(0, 1000) || null }).eq('id', r.id).select('*').single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ request: data })
  }
  if (b.action === 'cancel') {
    if (r.requested_email !== c.email && !c.isAdmin) return bad('You can only cancel your own requests.', 403)
    if (r.status !== 'pending') return bad('Already decided.')
    await db.from('approvals').delete().eq('id', r.id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
