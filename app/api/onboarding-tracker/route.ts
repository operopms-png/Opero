export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { buildTracker } from '@/lib/onboarding-tracker'
import { sendLinkReminder } from '@/lib/onboarding-reminders'
import { segmentByKey, ownerCol } from '@/lib/onboarding-steps'

// Onboarding tracker (staff board). Any signed-in staff member of the company can use it.
//   GET  ?older=1            -> { rows, counts }  every client being onboarded, with progress and a stuck flag
//   POST {action:'toggle', seg, customerId, key, done}  tick or untick a manual step
//   POST {action:'remind', linkId}                      email the client their private link again now
//   POST {action:'extend', linkId}                      give an expired or expiring link another 14 days and restart its reminders
export const maxDuration = 30
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const rows = await buildTracker(db, c.businessId, req.nextUrl.searchParams.get('older') === '1')
  const open = rows.filter(r => !r.complete)
  return NextResponse.json({ rows, counts: { total: rows.length, inProgress: open.length, stuck: rows.filter(r => r.stuck).length, complete: rows.length - open.length, notStarted: rows.filter(r => r.notStarted).length } })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'toggle') {
    const seg = segmentByKey(String(b.seg || '')), item = seg?.items.find(i => i.key === b.key)
    if (!seg || !item || seg.key === 'str_property' || !b.customerId) return bad('Unknown step.')
    if (item.auto && !item.hybrid) return bad('That step ticks itself from a real record.')
    const { data: own } = await db.from(seg.table).select('id').eq('id', String(b.customerId)).eq(ownerCol(seg), c.businessId).maybeSingle()
    if (!own) return bad('Client not found.', 404)
    const done = !!b.done, at = new Date().toISOString()
    const { error } = await db.from('onboarding_overrides').upsert({ user_id: c.businessId, module: seg.key, customer_id: own.id, item_key: item.key, done, done_at: done ? at : null, updated_at: at }, { onConflict: 'module,customer_id,item_key' })
    if (error) return bad(error.message, 500)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'remind' || b.action === 'extend') {
    const { data: l } = await db.from('onboarding_links').select('*').eq('id', String(b.linkId || '')).eq('business_id', c.businessId).maybeSingle()
    if (!l) return bad('Link not found.', 404)
    if (l.status === 'done') return bad('They have already finished.')
    if (b.action === 'extend') {
      await db.from('onboarding_links').update({ expires_at: new Date(Date.now() + 14 * 864e5).toISOString(), reminders: 0, last_reminded_at: null }).eq('id', l.id)
      return NextResponse.json({ ok: true })
    }
    if (new Date(l.expires_at).getTime() < Date.now()) return bad('That link has expired. Press Extend 14 days first.')
    if (!l.email) return bad('No email address on this link. Send them the link yourself.')
    const ok = await sendLinkReminder(l)
    return ok ? NextResponse.json({ ok: true }) : bad('The email could not be sent.', 502)
  }
  return bad('Unknown action.')
}
