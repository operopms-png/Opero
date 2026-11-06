import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

// Real Estate Intelligence → Landlord Feedback / Tenant Feedback: a team member replies to a person's feedback.
// The reply is saved on the feedback row (the person sees it in the Feedback tab of their portal) and emailed to them
// in the company's own email branding. Email and portal only, no text messages.
//   POST {id, reply}

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const PORTAL: Record<string, string> = { pm_landlords: '/pm-owner-portal', estate_landlords: '/estate-owner-portal', pm_tenants: '/pm-tenant-portal', estate_tenants: '/estate-tenant-portal' }

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const id = String(b.id || ''), reply = String(b.reply || '').trim().slice(0, 3000)
  if (!id || !reply) return bad('Write a reply first.')

  const { data: f } = await db.from('portal_feedback').select('*').eq('id', id).maybeSingle()
  if (!f || f.user_id !== c.businessId) return bad('Feedback not found.', 404)
  if (!PORTAL[f.person_table]) return bad('Unknown sender.', 400)

  const { error } = await db.from('portal_feedback').update({
    reply, replied_at: new Date().toISOString(), replied_by: c.name || c.email, status: f.status === 'New' ? 'Seen' : f.status,
  }).eq('id', id)
  if (error) return bad(error.message, 500)

  // Email the person (if we hold an address for them).
  let emailed = false
  try {
    const { data: p } = await db.from(f.person_table).select('email,name').eq('id', f.person_id).maybeSingle()
    if (p?.email) {
      const { brandedEmail } = await import('@/lib/branded-email')
      const first = String(p.name || f.person_name || '').trim().split(' ')[0]
      const text = `${first ? `Hello ${first},` : 'Hello,'}\n\nThank you for your feedback. A member of our team has replied:\n\n${reply}\n\nYou can see this reply, and leave more feedback, in the Feedback tab of your portal: ${SITE_URL}${PORTAL[f.person_table]}`
      const em = await brandedEmail(c.businessId, text)
      const r: any = await sendEmail(p.email, 'A reply to your feedback', em.html, em.replyTo, em.from)
      emailed = !r?.error && !r?.skipped
    }
  } catch { /* the reply is saved either way */ }

  return NextResponse.json({ ok: true, emailed })
}
