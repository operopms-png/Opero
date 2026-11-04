import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await db.from('data_requests').select('id, kind, status, note, created_at, completed_at').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(20)
  return NextResponse.json({ requests: data ?? [], isAdmin: c.isAdmin })
}

// POST { note? } -> asks us to delete the whole company account and its data. Checked by a person before anything is removed.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can request deletion.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const { data: open } = await db.from('data_requests').select('id').eq('business_id', c.businessId).eq('kind', 'delete').eq('subject', 'account').eq('status', 'pending').limit(1)
  if (open?.length) return NextResponse.json({ error: 'A deletion request is already waiting.' }, { status: 409 })
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : ''
  const { error } = await db.from('data_requests').insert({ business_id: c.businessId, requested_by: c.uid, requester_email: c.email, kind: 'delete', note: note || null })
  if (error) return NextResponse.json({ error: 'Could not save the request. Please try again.' }, { status: 500 })
  const to = process.env.DATA_REQUESTS_EMAIL || process.env.SUBMISSIONS_EMAIL
  if (to) await sendEmail(to, `Account deletion request from ${c.email}`, `<p><b>Deletion request</b></p><p>Account: ${esc(c.email)}<br>Business id: ${c.businessId}</p>${note ? `<p>${esc(note).replace(/\n/g, '<br>')}</p>` : ''}<p>Verify the person, offer an export first, then delete within 30 days.</p>`, c.email).catch(() => {})
  return NextResponse.json({ success: true })
}
