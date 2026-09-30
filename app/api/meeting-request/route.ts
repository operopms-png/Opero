import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

// Public "book a meeting" link (/meeting). Anyone can open it and send a
// meeting request; it lands in Staff Centre → Meetings as "New request" so
// the team can contact them and book a time. Deliberately unauthenticated:
// it only exposes the page's wording and topics, never account data.
//   GET  ?code=<page code>   -> heading, intro, topics
//   POST {code, name, email, phone, topic, meeting_type, preferred_time, message, website(honeypot)}
export const dynamic = 'force-dynamic'
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const clean = (v: any, n = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

async function pageFor(code?: string | null) {
  let q = serviceClient.from('meeting_booking_pages').select('*').eq('enabled', true)
  if (code) q = q.eq('code', code)
  const { data } = await q.order('updated_at').limit(1)
  return data?.[0] ?? null
}

export async function GET(req: NextRequest) {
  const p = await pageFor(req.nextUrl.searchParams.get('code'))
  if (!p) return bad('This booking link is not available.', 404)
  return NextResponse.json({ page: { code: p.code, heading: p.heading, intro: p.intro, topics: p.topics ?? [] } })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ success: true }) // honeypot: bots fill hidden fields
  const p = await pageFor(b.code)
  if (!p) return bad('This booking link is not available.', 404)

  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40)
  const topic = clean(b.topic, 120), type = clean(b.meeting_type, 40), when = clean(b.preferred_time, 300), message = clean(b.message, 3000)
  if (!name) return bad('Please add your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Please add a valid email address.')

  // Light flood protection: max 5 requests per email per day
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await serviceClient.from('meetings').select('id', { count: 'exact', head: true }).eq('user_id', p.business_id).eq('attendee_email', email).gte('created_at', since)
  if ((count ?? 0) >= 5) return bad('We’ve already received your request — we’ll be in touch soon.', 429)

  const { data: row, error } = await serviceClient.from('meetings').insert({
    user_id: p.business_id,
    created_by_email: 'Booking link',
    title: `${topic || 'Meeting request'} — ${name}`,
    duration_minutes: 30,
    token: randomBytes(12).toString('base64url'),
    status: 'requested',
    source: 'booking_page',
    attendee_name: name, attendee_email: email, attendee_phone: phone || null,
    topic: topic || null, meeting_type: type || null, preferred_time: when || null,
    notes: message || null,
  }).select('id').single()
  if (error) return bad('Sorry, something went wrong — please try again.', 500)

  // Tell the team (bell notification + email to the alert address)
  const summary = [`${name} <${email}>${phone ? ` · ${phone}` : ''}`, topic && `About: ${topic}`, type && `Prefers: ${type}`, when && `When: ${when}`, message && `\n${message}`].filter(Boolean).join('\n')
  await serviceClient.from('notifications').insert({ user_id: p.business_id, title: `New meeting request: ${name}`, message: summary.slice(0, 500), type: 'meeting_request', module: 'staffcentre', link: '/staff-centre/meetings', read: false })
  const { data: s } = await serviceClient.from('ai_receptionist_settings').select('alert_email').eq('business_id', p.business_id).maybeSingle()
  const alertTo = s?.alert_email || 'contact.us@sangstersgroup.com'
  await sendEmail(alertTo, `New meeting request: ${name}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><p><b>New meeting request from the booking link</b></p><p style="white-space:pre-wrap">${esc(summary)}</p><p><a href="${SITE_URL}/staff-centre/meetings">Open Meetings in the portal</a></p></div>`, email).catch(() => {})

  // Confirmation to the client
  await sendEmail(email, 'We’ve received your meeting request', `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for requesting a meeting with Sangsters Group${topic ? ` about <b>${esc(topic.toLowerCase())}</b>` : ''}. A member of our team will be in touch shortly to confirm a time${when ? ` — we’ve noted you prefer <b>${esc(when)}</b>` : ''}.</p><p>If anything changes, just reply to this email or call us on 020 7164 0329.</p><p>Kind regards,<br>Sangsters Group</p></div>`, alertTo).catch(() => {})

  return NextResponse.json({ success: true, id: row.id })
}
