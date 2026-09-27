export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { CORS_HEADERS, settingsByKey } from '@/lib/website-chat'

// Public job application form on a business's own website (e.g. the Careers page).
// POST { key, name, email, phone, role, category, message, website }
//  - key: the business's website public key (Staff Centre -> Website Chats -> Settings & install)
//  - website: hidden honeypot field; bots fill it, people don't
// Saves into Staff Centre -> Applications (stage "Applied"). The bell alert comes from the
// job_applications database trigger; this route also emails the team.

const CATEGORY_TO_MODULE: Record<string, string> = {
  'estate agency': 'estate',
  'operations': 'pm',
  'str & marketing': 'str',
  'hr & recruitment': '',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const reply = (body: any, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS })
  try {
    const body = await req.json()
    const s = await settingsByKey(String(body.key ?? ''))
    if (!s) return reply({ error: 'Applications are not available right now.' }, 404)

    // Bots fill hidden fields: pretend it worked, save nothing
    if (String(body.website ?? '').trim()) return reply({ ok: true })

    const clean = (v: any, max: number) => String(v ?? '').trim().slice(0, max)
    const name = clean(body.name, 120)
    const email = clean(body.email, 200).toLowerCase()
    const phone = clean(body.phone, 40)
    const role = clean(body.role, 120)
    const category = clean(body.category, 60)
    const message = clean(body.message, 3000)
    if (!name) return reply({ error: 'Please enter your name.' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Please check your email address.' }, 400)
    if (!role) return reply({ error: 'Please choose a role.' }, 400)

    // Same person, same role, in the last 10 minutes: don't save it twice
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: dupe } = await serviceClient.from('job_applications').select('id')
      .eq('user_id', s.business_id).eq('email', email).eq('role_applied', role).gte('created_at', since).limit(1)
    if (dupe?.length) return reply({ ok: true })

    const notes = [
      'Applied on the website careers page',
      category ? `Category: ${category}` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join('\n')

    const { error } = await serviceClient.from('job_applications').insert({
      user_id: s.business_id,
      candidate_name: name,
      email,
      phone: phone || null,
      role_applied: role,
      module: CATEGORY_TO_MODULE[category.toLowerCase()] ?? '',
      stage: 'Applied',
      notes,
    })
    if (error) {
      console.error('[careers-apply]', error)
      return reply({ error: 'Something went wrong. Please try again.' }, 500)
    }

    // Email the team (the bell alert is added by the database trigger)
    let to = s.alert_email
    if (!to) {
      const { data } = await serviceClient.auth.admin.getUserById(s.business_id)
      to = data?.user?.email ?? null
    }
    if (to) {
      const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
      const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://helloopero.com'
      await sendEmail(
        to,
        `New job application: ${name} for ${role}`.slice(0, 150),
        `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;color:#101828;line-height:1.6">
          <p>Someone applied on your website careers page.</p>
          <table style="border-collapse:collapse;margin:8px 0 14px">
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Role</td><td>${esc(role)}${category ? ` (${esc(category)})` : ''}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Name</td><td>${esc(name)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Email</td><td>${esc(email)}</td></tr>
            <tr><td style="padding:2px 16px 2px 0;color:#667085">Phone</td><td>${esc(phone || '—')}</td></tr>
          </table>
          ${message ? `<p style="white-space:pre-wrap;background:#F9FAFB;border:1px solid #EAECF0;border-radius:8px;padding:12px">${esc(message)}</p>` : ''}
          <p><a href="${site}/staff-centre/applications" style="display:inline-block;background:#3B4AFF;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open Applications</a></p>
        </div>`,
        email,
      )
    }

    return reply({ ok: true })
  } catch (err) {
    console.error('[careers-apply]', err)
    return reply({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
