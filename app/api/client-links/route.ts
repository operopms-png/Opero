export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DOC_SUBJECT_TABLE } from '@/lib/lease-doc-types'
import { PORTAL_SUBJECTS, WHO, emailPerson, type PortalSubject } from '@/lib/doc-hub'
import { LINK_DAYS, ensureLink, linkUrl } from '@/lib/client-link'

// Secure links for owners and tenants (staff only). The link opens their Documents, contracts to sign and invoices to pay, with no login.
//   POST {items:[{subject,id}], email?: true}   → {results:[{subject,id,name,url,whatsapp,emailed,reason?}]}
//   email true sends the link by email; otherwise it only returns the link and a ready-to-paste WhatsApp message.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental|estate/i.test(c.role || '')

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const b = await req.json().catch(() => ({}))
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 100).filter((i: any) => PORTAL_SUBJECTS.includes(i?.subject) && /^[0-9a-f-]{36}$/.test(i?.id || ''))
  if (!items.length) return bad('Choose who to send it to.')
  const results: any[] = []
  for (const i of items as { subject: PortalSubject; id: string }[]) {
    const { data: p } = await db.from(DOC_SUBJECT_TABLE[i.subject]).select('id, name, email').eq('id', i.id).eq('user_id', c.businessId).maybeSingle()
    if (!p) { results.push({ ...i, name: '', emailed: false, reason: 'not found' }); continue }
    const { token } = await ensureLink(c.businessId, i.subject, i.id, c.email || c.name || '')
    const url = linkUrl(token), first = String(p.name || '').trim().split(/\s+/)[0] || 'there'
    const tenant = i.subject === 'tenant' || i.subject === 'ea_tenant'
    const whatsapp = `Hi ${first}, ${tenant ? 'your tenancy documents, anything we still need from you and any rent to pay are all in one place' : 'your documents, anything we still need from you and any invoices to pay are all in one place'}. Open it here: ${url} (private to you, valid ${LINK_DAYS} days).`
    let emailed = false, reason = ''
    if (b.email) {
      emailed = await emailPerson(c.businessId, i.subject, p, 'Your documents are ready', tenant ? ['Sign your tenancy agreement', 'Upload anything we still need', 'Pay rent and invoices by card'] : ['Sign your agreements', 'Upload anything we still need', 'Pay invoices by card'], 'Open my documents', url)
      if (!emailed) reason = 'no email address, or email is not set up'
    }
    results.push({ ...i, name: p.name, who: WHO[i.subject], url, whatsapp, emailed, reason })
  }
  return NextResponse.json({ results })
}
