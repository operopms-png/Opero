import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { portalIdentity, loadMyData } from '@/lib/my-data'
import { sendEmail } from '@/lib/send-email'

// Data Hub for tenants and landlords: their own data only.
//   GET             -> what is held about me, as screens
//   GET ?download=1 -> the same as one JSON file (logged)
//   POST { kind: 'correct' | 'delete', note }  -> a request for the business to deal with. Nothing is changed or deleted automatically.

export const maxDuration = 30
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

export async function GET(req: NextRequest) {
  const me = await portalIdentity(req)
  if (!me) return bad('Not signed in', 401)
  const d = await loadMyData(me.uid, me.email)
  if (!d.role) return NextResponse.json({ role: null })
  const { data: reqs } = await db.from('data_requests').select('id,kind,status,note,created_at').eq('subject_email', me.email).neq('kind', 'export').order('created_at', { ascending: false }).limit(10)
  if (req.nextUrl.searchParams.get('download')) {
    await db.from('data_requests').insert({ business_id: d.businessId, requested_by: me.uid, requester_email: me.email, subject: d.role, subject_email: me.email, kind: 'export', status: 'completed', completed_at: new Date().toISOString() }).then(() => {}, () => {})
    return new Response(JSON.stringify({ generated: new Date().toISOString(), held_by: d.business, role: d.role, data: d.raw }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="my-novourq-data.json"', 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ role: d.role, business: d.business, summary: d.summary, sections: d.sections, requests: reqs ?? [] })
}

export async function POST(req: NextRequest) {
  const me = await portalIdentity(req)
  if (!me) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const kind = b.kind === 'correct' ? 'correct' : b.kind === 'delete' ? 'delete' : ''
  if (!kind) return bad('Choose what you want to ask for')
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : ''
  if (kind === 'correct' && note.length < 5) return bad('Tell us what is wrong and what it should say')
  const d = await loadMyData(me.uid, me.email)
  if (!d.role || !d.businessId) return bad('No account found', 404)
  const { data: open } = await db.from('data_requests').select('id').eq('subject_email', me.email).eq('kind', kind).eq('status', 'pending').limit(1)
  if (open?.length) return bad('You already have this request waiting.', 409)
  const { error } = await db.from('data_requests').insert({ business_id: d.businessId, requested_by: me.uid, requester_email: me.email, subject: d.role, subject_email: me.email, kind, note: note || null })
  if (error) return bad('Could not save the request. Please try again.', 500)
  const to = process.env.DATA_REQUESTS_EMAIL || process.env.SUBMISSIONS_EMAIL
  if (to) await sendEmail(to, `${kind === 'delete' ? 'Deletion' : 'Correction'} request from a ${d.role} (${me.email})`, `<p><b>${kind === 'delete' ? 'Data deletion' : 'Data correction'} request</b></p><p>${esc(d.role!)}: ${esc(me.email)}<br>Business: ${esc(d.business || '')} (${d.businessId})</p>${note ? `<p>${esc(note).replace(/\n/g, '<br>')}</p>` : ''}<p>Check who is asking and what must legally be kept before changing anything. Reply within 30 days.</p>`, me.email).catch(() => {})
  return NextResponse.json({ success: true })
}
