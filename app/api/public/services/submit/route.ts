import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } from 'pdf-lib'
import { randomBytes, randomUUID } from 'crypto'
import { sendEmail } from '@/lib/send-email'
import { teamEmails } from '@/lib/feedback-notify'
import { SITE_URL } from '@/lib/brand'
import { DOC_SETS, isSubject } from '@/lib/lease-doc-types'
import { serviceClient as db } from '@/lib/admin-auth'

// A recipient fills in a fillable document on their services link (/s/[token]) and presses Submit.
//   POST { t, doc, name, email, values: { fieldName: string | boolean } }  -> { ok }
// The values are written into the original PDF (still editable by staff) and stored privately;
// staff download it from Marketing, Services Pack, Submitted documents.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const t = String(b.t || '')
  if (!/^[0-9a-f]{16,64}$/.test(t)) return bad('This link is no longer available.', 404)
  const { data: l } = await db.from('service_links').select('*').eq('token', t).eq('active', true).maybeSingle()
  if (!l) return bad('This link is no longer available.', 404)
  const docId = String(b.doc || '')
  if (!l.doc_ids.includes(docId)) return bad('That document is not on this link.')
  const { data: doc } = await db.from('service_docs').select('id,title,url,fillable').eq('id', docId).eq('business_id', l.business_id).eq('active', true).maybeSingle()
  if (!doc || !doc.fillable) return bad('That document cannot be filled in online.')
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Enter your email address so we can reach you.')
  if (!String(b.name || '').trim()) return bad('Enter your name first.')
  const values = b.values && typeof b.values === 'object' ? b.values as Record<string, unknown> : {}
  if (Object.keys(values).length > 600) return bad('Too many fields.')

  const src = await fetch(doc.url)
  if (!src.ok) return bad('Could not open the document. Try again.', 502)
  const pdf = await PDFDocument.load(await src.arrayBuffer())
  const form = pdf.getForm()
  for (const [name, v] of Object.entries(values)) {
    let f
    try { f = form.getField(name) } catch { continue }
    try {
      if (f instanceof PDFTextField) f.setText(String(v ?? '').slice(0, 2000))
      else if (f instanceof PDFCheckBox) { if (v) f.check(); else f.uncheck() }
      else if (f instanceof PDFRadioGroup) { if (v) f.select(String(v)) }
      else if (f instanceof PDFDropdown || f instanceof PDFOptionList) { if (v) f.select(String(v)) }
    } catch { /* skip a value the field does not accept */ }
  }
  const out = await pdf.save()
  const path = `${l.business_id}/${l.id}/${Date.now()}-${randomBytes(4).toString('hex')}.pdf`
  const up = await db.storage.from('service-submissions').upload(path, out, { contentType: 'application/pdf' })
  if (up.error) return bad('Could not save your document. Try again.', 500)
  // If the link was made for a named landlord or co-host, file the completed copy on their record (Documents), awaiting review.
  let leaseDocId: string | null = null
  // A link made for "a new landlord / co-host" registers them now. Which section they go in depends on the document:
  // Estate agency agreement -> Estate Agency, Master Lease and Shortlet agreement -> Property Management, Shortlet agreement and co-host links -> Co-hosts.
  // The property is created too when the form has an address. Field names below are the ones in our own PDFs.
  let propertyMade = ''
  if (l.subject && !l.subject_id) {
    try {
      const file = String(doc.url).split('/').pop()?.replace(/\.pdf$/i, '') || ''
      const FM: Record<string, Record<string, string>> = {
        Agreement_Estate_Agency: { name: 'f0_4', phone: 'f0_7', address: 'f0_16' },
        Agreement_Master_Lease: { name: 'f0_1', phone: 'f0_5', address: 'f0_13', area: 'f0_14', beds: 'f0_17', baths: 'f0_18' },
        Agreement_Shortlet_Landlord: { name: 'f3_16', phone: 'f3_19', address: 'f4_23', area: 'f4_24', beds: 'f4_33', baths: 'f4_34' },
      }
      const m = FM[file] || {}
      const val = (k: string) => { const v = m[k] ? values[m[k]] : ''; return typeof v === 'string' ? v.trim().slice(0, 300) : '' }
      const kind = l.subject === 'cohost' || file === 'Agreement_Shortlet_Landlord' ? 'cohost' : file === 'Agreement_Estate_Agency' ? 'ea_landlord' : 'landlord'
      const tbl = kind === 'cohost' ? 'cohosts' : kind === 'ea_landlord' ? 'estate_landlords' : 'pm_landlords'
      const nm = (val('name') || String(b.name || '').trim()).slice(0, 120)
      let ex: any = (await db.from(tbl).select('id,name').eq('user_id', l.business_id).ilike('email', email).limit(1).maybeSingle()).data
      if (!ex) ex = (await db.from(tbl).insert({ user_id: l.business_id, name: nm, email, phone: val('phone') || null, ...(tbl !== 'cohosts' ? { notes: `Registered from the Services Pack link "${l.name}"` } : {}) }).select('id,name').single()).data
      if (ex) {
        l.subject = kind; l.subject_id = ex.id; l.subject_name = ex.name
        const addr = val('address')
        if (addr && kind !== 'cohost') {
          const ptbl = kind === 'ea_landlord' ? 'estate_properties' : 'pm_properties'
          const { data: dup } = await db.from(ptbl).select('id').eq('user_id', l.business_id).eq('owner_id', ex.id).ilike('address', `%${addr.replace(/[%_]/g, '')}%`).limit(1)
          if (!dup?.length) {
            const full = [addr, val('area')].filter(Boolean).join(', ')
            const row: any = { user_id: l.business_id, name: addr, address: full, owner_id: ex.id, status: 'Available', bedrooms: val('beds') || null, bathrooms: val('baths') || null }
            if (ptbl === 'pm_properties') { row.city = val('area') || null; row.country = 'Jamaica' }
            const pr = await db.from(ptbl).insert(row).select('id').single()
            if (!pr.error) propertyMade = `${addr} (${kind === 'ea_landlord' ? 'Estate Agency' : 'Property Management'})`
          }
        }
      }
    } catch { /* the submission is still kept in Services Pack */ }
  }
  if (l.subject && l.subject_id) {
    try {
      const lp = `${l.business_id}/${l.subject}/${l.subject_id}/${randomUUID()}.pdf`
      const u2 = await db.storage.from('lease-docs').upload(lp, out, { contentType: 'application/pdf' })
      if (!u2.error) {
        const cat = /^agreement/i.test(doc.title) ? (l.subject === 'cohost' ? 'cohost_agreement' : 'mgmt_agreement') : 'other'
        const { data: ld } = await db.from('lease_documents').insert({ user_id: l.business_id, subject: l.subject, head_lease_id: l.subject_id, category: cat, name: `${doc.title} (completed).pdf`.slice(0, 120), path: lp, mime: 'application/pdf', size: out.length, uploaded_by: String(b.email || '').trim() || String(b.name || '').trim() || l.subject_name, uploaded_by_portal: true, status: 'pending', visible_to_portal: true }).select('id').single()
        leaseDocId = ld?.id ?? null
        await db.from('notifications').insert({ user_id: l.business_id, title: `Document to review: ${doc.title}`, message: `${l.subject_name || 'A landlord'} completed ${doc.title} on their link.${propertyMade ? ` Property created: ${propertyMade}.` : ''} Approve or reject it in Documents.`, type: 'document', module: 'staffcentre', link: '/staff-centre/documents' }).then(() => {}, () => {})
      }
    } catch { /* the submission is still kept in Services Pack */ }
  }
  await db.from('service_submissions').insert({ lease_doc_id: leaseDocId, business_id: l.business_id, link_id: l.id, doc_id: doc.id, doc_title: doc.title, submitter_name: String(b.name || '').trim().slice(0, 120) || null, submitter_email: String(b.email || '').trim().slice(0, 160) || null, path })
  // Tell the team, with the completed PDF attached. A failed email never blocks the submission.
  try {
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const who = String(b.name || '').trim().slice(0, 120) || 'Someone'
    const subject = `${who} submitted ${doc.title}`
    const link = `${SITE_URL}/staff-centre/services-pack`
    const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#1D2433">
      <h2 style="margin:0 0 6px;font-size:18px;color:#182D5E">${esc(subject)}</h2>
      <p style="margin:0 0 14px;color:#667085;font-size:13px">From the link "${esc(l.name || '')}"${b.email ? ` · ${esc(String(b.email).slice(0, 160))}` : ''}. The completed PDF is attached.</p>
      <p style="margin:18px 0 0"><a href="${link}" style="background:#182D5E;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600">Open Submitted documents</a></p></div>`
    const att = [{ filename: `${doc.title.replace(/[^A-Za-z0-9 _-]+/g, '').trim() || 'Completed document'}.pdf`, content: Buffer.from(out).toString('base64') }]
    const replyTo = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email || '').trim()) ? String(b.email).trim() : undefined
    for (const addr of await teamEmails(l.business_id)) await sendEmail(addr, subject, html, replyTo, undefined, att).catch(() => null)
  } catch { /* ignore */ }
  // Documents they should now upload (ID and so on), when the submission was filed on a landlord or co-host record.
  const upload = leaseDocId && l.subject && isSubject(l.subject) ? DOC_SETS[l.subject as keyof typeof DOC_SETS].filter(t => !t.byUs).map(t => ({ key: t.key, label: t.label, hint: t.hint })) : []
  return NextResponse.json({ ok: true, upload })
}
