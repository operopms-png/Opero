// Emails the company's team when a landlord or tenant sends feedback or replies to a reply.
// Recipients: the business owner plus team members who are Admin, Co Founder or Property Management Team.
// Server-only. A failed email never blocks the feedback itself.
import { serviceClient as db } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function teamEmails(businessId: string): Promise<string[]> {
  const out = new Set<string>()
  try { const e = (await db.auth.admin.getUserById(businessId)).data.user?.email; if (e) out.add(e.toLowerCase()) } catch { /* ignore */ }
  const { data } = await db.from('team_members').select('email, role').eq('user_id', businessId)
  for (const m of data ?? []) if (m.email && /^(admin|co founder|property management team)$/i.test(String(m.role || '').trim())) out.add(String(m.email).toLowerCase())
  return Array.from(out)
}

export async function notifyTeamOfFeedback(f: any, kind: 'new' | 'reply', text: string) {
  try {
    const to = await teamEmails(f.user_id)
    if (!to.length) return 0
    const who = f.person_name || (f.source === 'tenant' ? 'A tenant' : 'A landlord')
    const tab = f.source === 'tenant' ? 'Tenant Feedback' : 'Landlord Feedback'
    const link = `${SITE_URL}/pm?tab=${encodeURIComponent(tab)}`
    const subject = kind === 'new' ? `New ${f.source} feedback from ${who}` : `${who} replied to your feedback response`
    const stars = f.rating ? `${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}` : ''
    const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#1D2433">
      <h2 style="margin:0 0 4px;font-size:18px;color:#1D4E89">${esc(subject)}</h2>
      <p style="margin:0 0 14px;color:#667085;font-size:13px">${esc(f.property_name || '')}${f.category ? ` · ${esc(f.category)}` : ''}${stars ? ` · ${stars}` : ''}</p>
      <div style="background:#F2F7FD;border-left:3px solid #2F6DB5;padding:12px 14px;border-radius:6px;white-space:pre-wrap;font-size:14px">${esc(text || '(no comment written)')}</div>
      <p style="margin:18px 0 0"><a href="${link}" style="background:#2F6DB5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600">Open ${esc(tab)}</a></p>
    </div>`
    let sent = 0
    for (const addr of to) { const r: any = await sendEmail(addr, subject, html).catch(() => null); if (r && !r.error && !r.skipped) sent++ }
    return sent
  } catch { return 0 }
}
