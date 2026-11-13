import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { audience, sendToList } from '@/lib/marketing-send'
import { pagePictures } from '@/lib/service-images'

// Marketing → Emails → Mailing list. Opted-in contacts of the caller's own company only.
// GET  -> { total, types, people, docs }
// POST { subject, body, audience, doc_ids, mode, email_id? } -> sends to each opted-in contact with an unsubscribe link.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const all = await audience(caller.businessId)
  const types: Record<string, number> = {}
  for (const c of all) { const k = c.type || 'other'; types[k] = (types[k] ?? 0) + 1 }
  const people = all.map(c => ({ name: c.name, email: c.email, type: c.type || 'other', source: c.source, at: c.marketing_opt_in_at })).sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
  const { data: docs } = await serviceClient.from('service_docs').select('id,title,url').eq('business_id', caller.businessId).eq('active', true).order('sort')
  const marketing = (docs ?? []).map(d => ({ id: d.id, title: d.title, pictures: pagePictures(d.url).length }))
  return NextResponse.json({ total: all.length, types, people, docs: marketing })
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  let subject = String(b.subject || '').trim().slice(0, 200), body = String(b.body || '').trim().slice(0, 20000), savedId: string | null = null, replyToken = ''
  if (b.email_id) {
    const { data: email } = await serviceClient.from('marketing_emails').select('*').eq('id', b.email_id).eq('user_id', caller.businessId).single()
    if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    if (email.status === 'Sent') return NextResponse.json({ error: 'That email has already been sent' }, { status: 400 })
    subject = email.subject; body = email.body ?? ''; savedId = email.id; replyToken = email.reply_token
  }
  const r = await sendToList({ businessId: caller.businessId, audience: String(b.audience || 'all'), mode: b.mode, subject, body, docIds: Array.isArray(b.doc_ids) ? b.doc_ids : [], savedId, replyToken })
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ success: true, sent: r.sent, failed: r.failed })
}
