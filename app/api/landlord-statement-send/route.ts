import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireUser } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { BRAND_NAME, SITE_URL, CONTACT_EMAIL } from '@/lib/brand'

// Emails a landlord the summary of a statement that staff just saved in
// landlord_statements, with a link to the full copy in their portal.
const gbp = (n: number) => (n < 0 ? '-£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export async function POST(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: st } = await serviceClient.from('landlord_statements').select('*').eq('id', id).maybeSingle()
  if (!st) return NextResponse.json({ error: 'Statement not found' }, { status: 404 })

  // Only the business owner or one of its team can send its statements
  let allowed = st.user_id === uid
  if (!allowed) {
    const { data: u } = await serviceClient.auth.admin.getUserById(uid)
    const email = u?.user?.email
    if (email) {
      const { data: tm } = await serviceClient.from('team_members').select('id').eq('user_id', st.user_id).eq('email', email).limit(1)
      allowed = !!tm?.length
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const table = st.module === 'pm' ? 'pm_landlords' : 'estate_landlords'
  const { data: landlord } = await serviceClient.from(table).select('name,email').eq('id', st.landlord_id).maybeSingle()
  if (!landlord?.email) return NextResponse.json({ emailed: false, reason: 'no email' })

  const s = st.snapshot?.summary ?? {}
  const portal = `${SITE_URL}${st.module === 'pm' ? '/pm-owner-portal' : '/estate-owner-portal'}`
  const row = (l: string, v: string, bold = false) => `<tr><td style="padding:6px 0;color:#676879">${l}</td><td style="padding:6px 0;text-align:right;${bold ? 'font-weight:700;color:#323338' : 'color:#323338'}">${v}</td></tr>`
  const owed = Number(st.balance) > 0.005
  const html = `
  <div style="font-family:Figtree,Arial,sans-serif;max-width:560px;margin:0 auto;color:#323338">
    <div style="background:linear-gradient(135deg,#FBF4E6,#F3E6C8);border:1px solid #EADBB8;border-radius:8px 8px 0 0;padding:20px 24px">
      <div style="font-size:12px;font-weight:600;color:#A8862E;letter-spacing:.06em">LANDLORD STATEMENT</div>
      <div style="font-size:20px;color:#624920;margin-top:4px">${esc(st.period_label)}</div>
    </div>
    <div style="border:1px solid #E6E9EF;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
      <p style="margin:0 0 14px">Hi ${esc(landlord.name)},</p>
      <p style="margin:0 0 16px">Your statement for <b>${esc(st.period_label)}</b> is ready.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Rent due', gbp(s.due ?? 0))}
        ${row('Rent received', gbp(s.received ?? 0))}
        ${row(`Our fee (${s.pct ?? 0}%)`, '-' + gbp(s.fee ?? 0))}
        ${row('Costs', '-' + gbp(s.costs ?? 0))}
        ${row('Paid to you', gbp(s.paidOut ?? 0))}
      </table>
      <div style="margin-top:14px;padding:12px 14px;border-radius:6px;background:${owed ? '#FFF4E0' : '#E6F9F0'};font-size:15px">
        ${owed ? 'Balance still to be paid to you' : 'Fully paid for this period'}: <b>${gbp(Math.abs(Number(st.balance) || 0))}</b>
      </div>
      ${st.note ? `<p style="margin:16px 0 0;white-space:pre-wrap;font-size:14px"><b>Note from your property manager:</b><br>${esc(st.note)}</p>` : ''}
      <p style="margin:22px 0 0"><a href="${portal}" style="background:#A8862E;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block">View full statement</a></p>
      <p style="margin:18px 0 0;font-size:12px;color:#9699A6">The full statement shows every rent payment, deduction and payment to you, and can be downloaded as a PDF from your landlord portal.</p>
    </div>
  </div>`

  const res = await sendEmail(landlord.email, `${BRAND_NAME}: your ${st.period_label} statement`, html, CONTACT_EMAIL)
  const emailed = !!(res as any)?.success
  if (emailed) await serviceClient.from('landlord_statements').update({ emailed_to: landlord.email }).eq('id', id)
  return NextResponse.json({ emailed, skipped: !!(res as any)?.skipped })
}
