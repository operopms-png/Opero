import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL, EMAIL_DOMAIN } from '@/lib/brand'
import { sendEmail } from '@/lib/send-email'
import { documentPdf } from '@/lib/document-pdf'
import { emptyBlanks, applyClientFields, blankLabel } from '@/lib/doc-text'
import { docSettings, docEmailHtml } from '@/lib/documents'

// The page a client opens from their email to read and sign a document (/sign/[token]).
//   GET ?t=<token>          -> { doc, company }     (records the first open)
//   GET ?t=<token>&pdf=1    -> the PDF
//   POST { t, name, agree, fields }                  sign it — fills any blanks left for the client,
//                                                    records name, time and IP, emails signed copies
// Drafts, documents waiting for approval and cancelled documents are never shown.
export const maxDuration = 30
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const HIDDEN = ['draft', 'pending_approval', 'rejected', 'void']

async function load(t: string) {
  if (!/^[0-9a-f]{20,64}$/.test(t)) return null
  const { data } = await db.from('doc_sends').select('*').eq('token', t).maybeSingle()
  return data && !HIDDEN.includes(data.status) ? data : null
}
const pub = (d: any) => ({ title: d.title, body: d.body, recipient_name: d.recipient_name, property_label: d.property_label, needs_signature: d.needs_signature, status: d.status, signed_at: d.signed_at, signed_name: d.signed_name, blanks: emptyBlanks(d.body).map(x => ({ ...x, label: blankLabel(x.key) })) })

export async function GET(req: NextRequest) {
  const d = await load(req.nextUrl.searchParams.get('t') || '')
  if (!d) return bad('Document not found', 404)
  const s = await docSettings(d.business_id)
  if (req.nextUrl.searchParams.get('pdf')) {
    const bytes = await documentPdf(d, s, SITE_URL)
    return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${String(d.title).replace(/[^\w\- ]+/g, '').trim() || 'document'}.pdf"` } })
  }
  if (d.status === 'sent') {
    await db.from('doc_sends').update({ status: 'opened', opened_at: new Date().toISOString() }).eq('id', d.id)
    d.status = 'opened'
  }
  return NextResponse.json({ doc: pub(d), company: { name: s.company_name, logo_url: s.logo_url } })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const d = await load(String(b.t || ''))
  if (!d) return bad('Document not found', 404)
  if (!d.needs_signature) return bad('This document doesn’t need a signature.')
  if (d.status === 'signed') return bad('This document has already been signed.')
  const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 120)
  if (name.length < 3 || !/\s/.test(name)) return bad('Type your full name to sign.')
  if (b.agree !== true) return bad('Tick the box to confirm you agree.')
  const vals: Record<string, string> = {}
  for (const bl of emptyBlanks(d.body)) {
    const v = String((b.fields || {})[bl.key] ?? '').trim().slice(0, 300)
    if (!v) return bad(`Please fill in: ${blankLabel(bl.key)}`)
    if (bl.options && !bl.options.includes(v)) return bad(`Choose one option for: ${blankLabel(bl.key)}`)
    vals[bl.key] = v
  }
  const now = new Date().toISOString()
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 60) || null
  const body = applyClientFields(d.body, vals)
  const { data: signed, error } = await db.from('doc_sends').update({ body, client_fields: vals, status: 'signed', signed_at: now, signed_name: name, signed_ip: ip, signed_ua: (req.headers.get('user-agent') || '').slice(0, 300), updated_at: now }).eq('id', d.id).eq('status', d.status).select('*').single()
  if (error || !signed) return bad('That didn’t go through — refresh the page and try again.', 409)

  // tell the team, and email signed copies to the client and to whoever sent it
  await db.from('notifications').insert({ user_id: d.business_id, title: `Signed: ${d.title}`.slice(0, 300), message: `${name} signed ${d.title}${d.property_label ? ` for ${d.property_label}` : ''}.`, type: 'document', module: 'staffcentre', link: `/staff-centre/documents?id=${d.id}`, read: false })
  try {
    const s = await docSettings(d.business_id), company = s.company_name || 'Sangsters Group'
    const bytes = await documentPdf(signed, s, SITE_URL)
    const att = [{ filename: `${String(d.title).replace(/[^\w\- ]+/g, '').trim() || 'document'} - signed.pdf`, content: Buffer.from(bytes).toString('base64') }]
    const link = `${SITE_URL}/sign/${d.token}`
    const from = `${company} <notifications@${EMAIL_DOMAIN}>`
    if (d.recipient_email) await sendEmail(d.recipient_email, `Signed: ${d.title}`, docEmailHtml(company, s.contact_lines, name.split(' ')[0], `Thank you for signing ${d.title}. Your signed copy is attached for your records.`, link, 'View signed document', 'Keep this email for your records.'), d.created_email || s.reply_to || undefined, from, att)
    const staffTo = d.created_email || s.reply_to
    if (staffTo) await sendEmail(staffTo, `Signed: ${d.title} — ${name}`, docEmailHtml(company, s.contact_lines, String(d.created_by || 'there').split(' ')[0], `${name} has signed ${d.title}${d.property_label ? ` for ${d.property_label}` : ''}. The signed copy is attached and saved in Documents.`, `${SITE_URL}/staff-centre/documents?id=${d.id}`, 'Open in Documents', ''), undefined, from, att)
  } catch { /* the signature is saved either way */ }
  return NextResponse.json({ doc: pub(signed) })
}
