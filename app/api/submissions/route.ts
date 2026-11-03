import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'

// Settings -> Submissions. A client reports an issue or bug, leaves a review or a suggestion.
// GET  -> this business's own submissions, newest first
// POST {kind, title, body, rating?} -> saves it and, if SUBMISSIONS_EMAIL is set in Netlify, emails it to us
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const clip = (v: any, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const KINDS = ['issue', 'review', 'suggestion']
const LABEL: Record<string, string> = { issue: 'Issue or bug', review: 'Review', suggestion: 'Suggestion' }

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('client_submissions').select('id, kind, title, body, rating, status, reply, created_at').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submissions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const kind = String(b.kind || '')
  const title = clip(b.title, 140), body = clip(b.body, 4000)
  const rating = Number(b.rating)
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Choose what you are sending.' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Add a short title.' }, { status: 400 })
  if (kind === 'review' && !(rating >= 1 && rating <= 5)) return NextResponse.json({ error: 'Choose a star rating from 1 to 5.' }, { status: 400 })
  const { data, error } = await db.from('client_submissions').insert({
    business_id: c.businessId, user_id: c.uid, user_name: c.name, user_email: c.email, kind, title, body: body || null, rating: kind === 'review' ? rating : null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const to = process.env.SUBMISSIONS_EMAIL
  if (to) {
    const esc = (t: string) => t.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))
    await sendEmail(to, `${LABEL[kind]} from ${c.name || c.email}: ${title}`,
      `<p><b>${LABEL[kind]}</b>${kind === 'review' ? ` · ${rating}/5` : ''}</p><p><b>${esc(title)}</b></p><p>${esc(body).replace(/\n/g, '<br>')}</p><p style="color:#667085">From ${esc(c.name || '')} (${esc(c.email)}), business ${c.businessId}</p>`, c.email).catch(() => {})
  }
  return NextResponse.json({ success: true, id: data.id })
}
