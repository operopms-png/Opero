// Adds a lead to the CRM from a public form (listings viewing request,
// "tell us what you need", meeting booking link): one contact per email
// (existing contacts get the new details added to their notes rather than a
// duplicate), plus a deal in the Enquiry stage so it shows in the Pipeline.
// The CRM boards pick these rows up through their database triggers.
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

export type Lead = {
  businessId: string; name: string; email?: string | null; phone?: string | null
  source: string; module: string; type: string; notes: string; dealName: string
}

export async function addCrmLead(l: Lead): Promise<string | null> {
  const stamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const entry = `[${stamp} · ${l.source}]\n${l.notes}`.slice(0, 4000)
  let contactId: string | null = null
  if (l.email) {
    const { data: existing } = await serviceClient.from('crm_contacts').select('id,notes,phone').eq('user_id', l.businessId).ilike('email', l.email).order('created_at').limit(1)
    if (existing?.[0]) {
      contactId = existing[0].id
      await serviceClient.from('crm_contacts').update({ notes: [existing[0].notes, entry].filter(Boolean).join('\n\n').slice(-8000), ...(l.phone && !existing[0].phone ? { phone: l.phone } : {}) }).eq('id', contactId)
    }
  }
  if (!contactId) {
    const { data } = await serviceClient.from('crm_contacts').insert({ user_id: l.businessId, name: l.name, email: l.email || null, phone: l.phone || null, source: l.source, module: l.module, type: l.type, status: 'prospect', notes: entry }).select('id').single()
    contactId = data?.id ?? null
  }
  await serviceClient.from('crm_deals').insert({ user_id: l.businessId, name: l.dealName.slice(0, 200), contact_id: contactId, module: l.module, stage: 'Enquiry', value: null })
  return contactId
}

const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// Bell notification + email to the team's alert address. Returns that address.
export async function alertTeam(businessId: string, title: string, body: string, link: string, replyTo?: string) {
  await serviceClient.from('notifications').insert({ user_id: businessId, title: title.slice(0, 300), message: body.slice(0, 500), type: 'lead', module: 'staffcentre', link, read: false })
  const { data: s } = await serviceClient.from('ai_receptionist_settings').select('alert_email').eq('business_id', businessId).maybeSingle()
  const to = s?.alert_email || 'contact.us@sangstersgroup.com'
  await sendEmail(to, title, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><p><b>${esc(title)}</b></p><p style="white-space:pre-wrap">${esc(body)}</p><p><a href="${SITE_URL}${link}">Open in the portal</a></p></div>`, replyTo).catch(() => {})
  return to
}
