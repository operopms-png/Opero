import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceClient } from '@/lib/admin-auth'

const IDLE_MS = 15 * 60 * 1000   // no activity for 15 minutes ends a session at the last time they were seen
const MAX_PAGES = 300

// POST { path, end? }: heartbeat from the signed-in browser (every minute while the tab is open and visible).
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ ok: false }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const path = String(b.path ?? '').slice(0, 160)
  const now = new Date()
  const { data: open } = await serviceClient.from('work_sessions').select('*').eq('user_id', c.uid).is('ended_at', null).order('last_seen_at', { ascending: false }).limit(1)
  let s = open?.[0]
  // an old open session that went quiet is closed at the last time they were seen
  if (s && now.getTime() - new Date(s.last_seen_at).getTime() > IDLE_MS) {
    await serviceClient.from('work_sessions').update({ ended_at: s.last_seen_at, end_reason: 'Went idle or closed the tab' }).eq('id', s.id)
    s = undefined
  }
  if (!s) {
    if (b.end) return NextResponse.json({ ok: true })
    // staff and account owners only: never record tenants, landlords or other outside users
    const [t, o1, o2] = await Promise.all([
      serviceClient.from('team_members').select('id', { count: 'exact', head: true }).eq('email', c.email),
      serviceClient.from('mailboxes').select('id', { count: 'exact', head: true }).eq('user_id', c.uid),
      serviceClient.from('hr_employees').select('id', { count: 'exact', head: true }).eq('user_id', c.uid),
    ])
    if (!(t.count || o1.count || o2.count)) return NextResponse.json({ ok: true, skipped: true })
    const { data } = await serviceClient.from('work_sessions').insert({ business_id: c.businessId, user_id: c.uid, email: c.email, name: c.name, user_agent: (req.headers.get('user-agent') ?? '').slice(0, 200), pages: path ? [{ p: path, t: now.toISOString() }] : [] }).select('*').single()
    return NextResponse.json({ ok: true, id: data?.id })
  }
  const gap = Math.min((now.getTime() - new Date(s.last_seen_at).getTime()) / 1000, 120)
  const pages = Array.isArray(s.pages) ? s.pages : []
  const last = pages[pages.length - 1]
  if (path && last?.p !== path && pages.length < MAX_PAGES) pages.push({ p: path, t: now.toISOString() })
  const patch: any = { last_seen_at: now.toISOString(), active_seconds: s.active_seconds + Math.round(gap), pages }
  if (b.end) { patch.ended_at = now.toISOString(); patch.end_reason = 'Signed out' }
  await serviceClient.from('work_sessions').update(patch).eq('id', s.id)
  return NextResponse.json({ ok: true })
}

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD: the account owner, and staff the owner has chosen, see everyone in the company.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (c.uid !== c.businessId) {
    const { count } = await serviceClient.from('work_hours_viewers').select('email', { count: 'exact', head: true }).eq('business_id', c.businessId).eq('email', c.email)
    if (!count) return NextResponse.json({ error: 'Work hours are only shown to the account owner and anyone they choose' }, { status: 403 })
  }
  const u = new URL(req.url)
  const from = u.searchParams.get('from') || new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
  const to = u.searchParams.get('to') || new Date().toISOString().slice(0, 10)
  const { data } = await serviceClient.from('work_sessions').select('id,email,name,started_at,last_seen_at,ended_at,end_reason,active_seconds,pages')
    .eq('business_id', c.businessId).gte('started_at', from + 'T00:00:00Z').lte('started_at', to + 'T23:59:59Z').order('started_at', { ascending: false }).limit(2000)
  const now = Date.now()
  const sessions = (data ?? []).map((s: any) => {
    const live = !s.ended_at && now - new Date(s.last_seen_at).getTime() <= IDLE_MS
    const end = s.ended_at ?? s.last_seen_at
    return { ...s, live, signed_out: live ? null : end, seconds: Math.max(0, Math.round((new Date(end).getTime() - new Date(s.started_at).getTime()) / 1000)) }
  })
  return NextResponse.json({ sessions })
}
