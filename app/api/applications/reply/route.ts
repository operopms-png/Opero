import { NextRequest, NextResponse } from 'next/server'
import { getCaller, sendFromMailbox } from '@/lib/mailbox'
import { serviceClient } from '@/lib/admin-auth'

export const maxDuration = 60

// POST { id, subject, body }: sends the reply to the applicant's own email from the company's
// applicants mailbox (Email, Mailbox settings, Applicants). A member of staff presses Send; nothing goes automatically.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const subject = String(b.subject ?? '').trim().slice(0, 200)
  const body = String(b.body ?? '').trim().slice(0, 8000)
  if (!subject || !body) return NextResponse.json({ error: 'Add a subject and a message' }, { status: 400 })
  const { data: app } = await serviceClient.from('job_applications').select('id,email').eq('id', String(b.id ?? '')).eq('user_id', c.businessId).maybeSingle()
  if (!app?.email) return NextResponse.json({ error: 'This applicant has no email address' }, { status: 400 })
  const { data: boxes } = await serviceClient.from('mailboxes').select('*').eq('user_id', c.businessId).eq('use_for_applicants', true).eq('status', 'connected').limit(1)
  const mb = boxes?.[0]
  if (!mb) return NextResponse.json({ error: 'No applicants mailbox is set up. In Email, Mailbox settings, connect your careers mailbox and switch on Applicants.' }, { status: 409 })
  try {
    const esc = (t: string) => t.replace(/[&<>]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[x]!))
    await sendFromMailbox(mb, { to: app.email, subject, text: body, html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(body)}</div>`, sentBy: c.name })
    return NextResponse.json({ ok: true, from: mb.email })
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not send: ' + (e?.message || 'mail server refused it') }, { status: 502 })
  }
}
