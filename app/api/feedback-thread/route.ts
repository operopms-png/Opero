import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { notifyTeamOfFeedback } from '@/lib/feedback-notify'

// Feedback follow-ups: a two-way thread between a landlord or tenant and the team, on one piece of feedback.
//   GET  ?ids=a,b,c          → the messages on those feedback items (the team sees their company's, a person sees their own)
//   POST {feedback_id, body} → the landlord or tenant adds a message; the team is emailed and the item goes back to New
//   POST {feedback_id, action:'notify_new'} → right after someone sends new feedback: email the team (within 10 minutes of it being sent)
// The team's own replies are sent through /api/feedback-reply, which also adds them to this thread.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const PERSON_TABLES = ['pm_landlords', 'estate_landlords', 'pm_tenants', 'estate_tenants']

async function who(req: NextRequest, f: any): Promise<'team' | 'person' | null> {
  const c = await getCaller(req)
  if (!c) return null
  if (f.user_id === c.businessId) return 'team'
  if (!PERSON_TABLES.includes(f.person_table)) return null
  const { data: p } = await db.from(f.person_table).select('portal_user_id').eq('id', f.person_id).maybeSingle()
  return p?.portal_user_id && p.portal_user_id === c.uid ? 'person' : null
}

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 200)
  if (!ids.length) return NextResponse.json({ messages: [] })
  const { data: fbs } = await db.from('portal_feedback').select('*').in('id', ids)
  const okIds: string[] = []
  for (const f of fbs ?? []) if (await who(req, f)) okIds.push(f.id)
  if (!okIds.length) return NextResponse.json({ messages: [] })
  const { data } = await db.from('portal_feedback_messages').select('id, feedback_id, sender, sender_name, body, created_at').in('feedback_id', okIds).order('created_at', { ascending: true })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const id = String(b.feedback_id || '')
  if (!id) return bad('feedback_id is required')
  const { data: f } = await db.from('portal_feedback').select('*').eq('id', id).maybeSingle()
  if (!f) return bad('Feedback not found.', 404)
  const role = await who(req, f)
  if (!role) return bad('Not allowed.', 403)

  if (b.action === 'notify_new') {
    if (role !== 'person') return bad('Not allowed.', 403)
    if (Date.now() - new Date(f.created_at).getTime() > 10 * 60 * 1000) return NextResponse.json({ ok: true, emailed: 0 })
    const emailed = await notifyTeamOfFeedback(f, 'new', f.comment || '')
    return NextResponse.json({ ok: true, emailed })
  }

  const body = String(b.body || '').trim().slice(0, 3000)
  if (!body) return bad('Write a message first.')
  if (role !== 'person') return bad('Team replies are sent from the feedback page.', 400)
  const { data: msg, error } = await db.from('portal_feedback_messages').insert({ feedback_id: id, user_id: f.user_id, sender: 'person', sender_name: f.person_name ?? null, body }).select('id, feedback_id, sender, sender_name, body, created_at').single()
  if (error) return bad(error.message, 500)
  await db.from('portal_feedback').update({ status: 'New' }).eq('id', id)
  const emailed = await notifyTeamOfFeedback(f, 'reply', body)
  return NextResponse.json({ ok: true, message: msg, emailed })
}
