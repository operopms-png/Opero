import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { SITE_URL, EMAIL_DOMAIN } from '@/lib/brand'
import { sendEmail } from '@/lib/send-email'
import { documentPdf } from '@/lib/document-pdf'
import { sanitizeHtml, settleBlanks, wordingText, changeSummary, esc } from '@/lib/doc-text'
import { searchPeople, createFromTemplate, deliverDocument, docSettings, docEmailHtml, runDocAutomation, TRIGGERS } from '@/lib/documents'

// Staff Centre → Documents.
//   GET                         -> { docs, stats, isAdmin }               sent documents
//   GET ?id=…                   -> { doc, template, isAdmin }
//   GET ?id=…&pdf=1             -> the PDF
//   GET ?templates=1            -> { templates, isAdmin }
//   GET ?template=…             -> { template }
//   GET ?people=text            -> { people }
//   GET ?files=1                -> { files, isAdmin }
//   GET ?rules=1                -> { rules, triggers, templates, isAdmin }
//   POST {action:'create', template_id, person_kind?, person_id?}   new draft from a template, blanks filled in
//   POST {action:'save'|'send', id, body, recipient_name, recipient_email, email_subject, email_message, needs_signature}
//        Wording changes on an "Editable with approval" template go to Finance → Approvals first (admins send straight away).
//   POST {action:'remind'|'void'|'delete', id}
//   POST {action:'template-save'|'template-delete'|'template-import', …}   (admins)
//   POST {action:'file-add'|'file-delete'|'file-send', …}
//   POST {action:'rule-save'|'rule-delete'|'run-rules', …}                  (admins)

export const maxDuration = 60
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const LIST_COLS = 'id,title,status,person_kind,recipient_name,recipient_email,property_label,created_by,created_at,sent_at,opened_at,signed_at,signed_name,changed,rule_id,needs_signature,reminders,template_id'
const AUDIENCES = ['tenant', 'owner', 'guest', 'partner', 'client', 'any']

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const sp = req.nextUrl.searchParams, biz = c.businessId

  if (sp.get('people') !== null) return NextResponse.json({ people: await searchPeople(biz, sp.get('people') || '') })
  if (sp.get('templates')) {
    const { data } = await db.from('doc_templates').select('id,name,category,audience,lock_mode,needs_signature,remind_days,active,updated_at,created_by,source_url').eq('business_id', biz).order('category').order('name')
    const { data: uses } = await db.from('doc_sends').select('template_id').eq('business_id', biz).not('template_id', 'is', null)
    const n: Record<string, number> = {}; for (const u of uses ?? []) n[u.template_id] = (n[u.template_id] || 0) + 1
    return NextResponse.json({ templates: (data ?? []).map(t => ({ ...t, uses: n[t.id] || 0 })), isAdmin: c.isAdmin })
  }
  if (sp.get('template')) {
    const { data } = await db.from('doc_templates').select('*').eq('id', sp.get('template')!).eq('business_id', biz).maybeSingle()
    return data ? NextResponse.json({ template: data, isAdmin: c.isAdmin }) : bad('Template not found', 404)
  }
  if (sp.get('files')) {
    const { data } = await db.from('doc_files').select('*').eq('business_id', biz).order('created_at', { ascending: false }).limit(1000)
    return NextResponse.json({ files: data ?? [], isAdmin: c.isAdmin })
  }
  if (sp.get('rules')) {
    const [{ data: rules }, { data: templates }] = await Promise.all([
      db.from('doc_rules').select('*').eq('business_id', biz).order('created_at'),
      db.from('doc_templates').select('id,name,active').eq('business_id', biz).order('name'),
    ])
    return NextResponse.json({ rules: rules ?? [], templates: templates ?? [], triggers: TRIGGERS, isAdmin: c.isAdmin })
  }
  const id = sp.get('id')
  if (id) {
    const { data: doc } = await db.from('doc_sends').select('*').eq('id', id).eq('business_id', biz).maybeSingle()
    if (!doc) return bad('Document not found', 404)
    if (sp.get('pdf')) {
      const bytes = await documentPdf(doc, await docSettings(biz), SITE_URL)
      return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${String(doc.title).replace(/[^\w\- ]+/g, '').trim() || 'document'}.pdf"` } })
    }
    const { data: template } = doc.template_id ? await db.from('doc_templates').select('id,name,lock_mode').eq('id', doc.template_id).maybeSingle() : { data: null }
    return NextResponse.json({ doc, template, isAdmin: c.isAdmin, me: c.email })
  }
  const { data, error } = await db.from('doc_sends').select(LIST_COLS).eq('business_id', biz).order('created_at', { ascending: false }).limit(500)
  if (error) return bad(error.message, 500)
  const docs = data ?? [], month = new Date().toISOString().slice(0, 7)
  const stats = {
    waiting: docs.filter(d => d.needs_signature && ['sent', 'opened'].includes(d.status)).length,
    approval: docs.filter(d => d.status === 'pending_approval').length,
    signedMonth: docs.filter(d => d.signed_at && String(d.signed_at).startsWith(month)).length,
    automatic: docs.filter(d => d.rule_id && d.sent_at).length,
  }
  return NextResponse.json({ docs, stats, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const biz = c.businessId, by = c.name || c.email, now = new Date().toISOString()
  const adminOnly = () => c.isAdmin ? null : bad('Only admins can change templates and automatic rules.', 403)

  // ---------- templates ----------
  if (b.action === 'template-save') {
    const no = adminOnly(); if (no) return no
    const name = String(b.name || '').trim().slice(0, 150)
    if (!name) return bad('Give the template a name.')
    const body = sanitizeHtml(String(b.body || '')).slice(0, 300_000)
    if (!body) return bad('The template is empty.')
    const defaults: Record<string, string> = {}
    for (const [k, v] of Object.entries(b.defaults || {})) if (/^[a-z][a-z0-9_]*$/.test(k) && String(v ?? '').trim()) defaults[k] = String(v).slice(0, 500)
    const row = {
      name, category: String(b.category || 'Other').slice(0, 60), audience: AUDIENCES.includes(b.audience) ? b.audience : 'any', body, defaults,
      lock_mode: ['locked', 'approval', 'editable'].includes(b.lock_mode) ? b.lock_mode : 'approval', needs_signature: b.needs_signature !== false,
      remind_days: Math.max(0, Math.min(30, Number(b.remind_days) || 0)), email_subject: String(b.email_subject || '').slice(0, 200) || null,
      email_message: String(b.email_message || '').slice(0, 2000) || null, active: b.active !== false, updated_at: now,
    }
    const res = b.id
      ? await db.from('doc_templates').update(row).eq('id', b.id).eq('business_id', biz).select('*').single()
      : await db.from('doc_templates').insert({ ...row, business_id: biz, created_by: by }).select('*').single()
    return res.error ? bad(res.error.message, 500) : NextResponse.json({ template: res.data })
  }
  if (b.action === 'template-delete') {
    const no = adminOnly(); if (no) return no
    await db.from('doc_templates').delete().eq('id', String(b.id || '')).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'template-import') {
    const no = adminOnly(); if (no) return no
    const name = String(b.filename || '')
    if (!/\.docx$/i.test(name)) return bad('Upload a Word file (.docx). For a PDF, copy the text and paste it into the template.')
    try {
      const mammoth: any = await import('mammoth')
      const r = await (mammoth.default || mammoth).convertToHtml({ buffer: Buffer.from(String(b.content || ''), 'base64') })
      // turn runs of underscores (the blanks in a printed form) into a visible gap staff can replace with a blank
      const body = sanitizeHtml(String(r.value || '')).replace(/_{4,}/g, '__________')
      return NextResponse.json({ body })
    } catch (e: any) { return bad('That Word file couldn’t be read: ' + (e.message || 'unknown error')) }
  }

  // ---------- library ----------
  if (b.action === 'file-add') {
    const url = String(b.url || '')
    if (!/^https:\/\//.test(url)) return bad('Upload failed — try again.')
    const { data, error } = await db.from('doc_files').insert({ business_id: biz, name: String(b.name || 'File').slice(0, 200), folder: String(b.folder || 'General').slice(0, 60), url, size: Number(b.size) || null, mime: String(b.mime || '').slice(0, 100) || null, property_label: String(b.property_label || '').slice(0, 200) || null, uploaded_by: by }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ file: data })
  }
  if (b.action === 'file-update') {
    const patch: any = {}
    if (b.name) patch.name = String(b.name).slice(0, 200)
    if (b.folder) patch.folder = String(b.folder).slice(0, 60)
    const { data, error } = await db.from('doc_files').update(patch).eq('id', String(b.id || '')).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ file: data })
  }
  if (b.action === 'file-delete') {
    if (!c.isAdmin) return bad('Only admins can delete files.', 403)
    await db.from('doc_files').delete().eq('id', String(b.id || '')).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'file-send') {
    const { data: f } = await db.from('doc_files').select('*').eq('id', String(b.id || '')).eq('business_id', biz).maybeSingle()
    if (!f) return bad('File not found', 404)
    const to = String(b.to || '').trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return bad('Add the email address to send it to.')
    const s = await docSettings(biz), company = s.company_name || 'Sangsters Group'
    const first = String(b.name || '').trim().split(/\s+/)[0] || 'there'
    const html = docEmailHtml(company, s.contact_lines, first, String(b.message || '').trim() || `Please find ${f.name} below.`, f.url, 'Open document', `Sent by ${esc(by)}.`)
    const r = await sendEmail(to, String(b.subject || '').trim() || `${f.name} — ${company}`, html, c.email || s.reply_to || undefined, `${company} <notifications@${EMAIL_DOMAIN}>`)
    if ((r as any).skipped) return bad('Email isn’t set up on the portal yet (RESEND_API_KEY missing in Netlify). Copy the link and send it yourself for now.', 503)
    if ((r as any).error) return bad(`The email didn’t go: ${(r as any).error}`.slice(0, 400), 502)
    return NextResponse.json({ ok: true })
  }

  // ---------- automatic rules ----------
  if (b.action === 'rule-save') {
    const no = adminOnly(); if (no) return no
    if (!TRIGGERS[b.trigger]) return bad('Choose when it should send.')
    const { data: t } = await db.from('doc_templates').select('id').eq('id', String(b.template_id || '')).eq('business_id', biz).maybeSingle()
    if (!t) return bad('Choose which template to send.')
    const enabled = b.enabled === true
    if (b.id) {
      const { data: cur } = await db.from('doc_rules').select('*').eq('id', b.id).eq('business_id', biz).maybeSingle()
      if (!cur) return bad('Rule not found', 404)
      const { data, error } = await db.from('doc_rules').update({ trigger: b.trigger, template_id: t.id, enabled, enabled_at: enabled && !cur.enabled ? now : cur.enabled_at }).eq('id', cur.id).select('*').single()
      return error ? bad(error.message, 500) : NextResponse.json({ rule: data })
    }
    const { data, error } = await db.from('doc_rules').insert({ business_id: biz, trigger: b.trigger, template_id: t.id, enabled, enabled_at: enabled ? now : null, created_by: by }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ rule: data })
  }
  if (b.action === 'rule-delete') {
    const no = adminOnly(); if (no) return no
    await db.from('doc_rules').delete().eq('id', String(b.id || '')).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'run-rules') {
    const no = adminOnly(); if (no) return no
    return NextResponse.json({ report: await runDocAutomation(biz) })
  }

  // ---------- documents ----------
  if (b.action === 'create') {
    const { data: tpl } = await db.from('doc_templates').select('*').eq('id', String(b.template_id || '')).eq('business_id', biz).maybeSingle()
    if (!tpl) return bad('Choose a template.')
    const kind = b.person_kind || null, pid = /^[0-9a-f-]{36}$/.test(b.person_id || '') ? b.person_id : null
    try {
      const doc = await createFromTemplate(biz, tpl, kind, pid, { name: by, email: c.email })
      const patch: any = {}
      if (!pid && b.recipient_name) patch.recipient_name = String(b.recipient_name).slice(0, 150)
      if (b.recipient_email && !doc.recipient_email) patch.recipient_email = String(b.recipient_email).slice(0, 200)
      if (Object.keys(patch).length) await db.from('doc_sends').update(patch).eq('id', doc.id)
      return NextResponse.json({ doc: { ...doc, ...patch } })
    } catch (e: any) { return bad(e.message, 500) }
  }

  const { data: doc } = await db.from('doc_sends').select('*').eq('id', String(b.id || '')).eq('business_id', biz).maybeSingle()
  if (!doc) return bad('Document not found', 404)
  const mine = doc.created_email === c.email || c.isAdmin

  if (b.action === 'save' || b.action === 'send') {
    if (!['draft', 'rejected'].includes(doc.status) && !(b.action === 'send' && doc.status === 'pending_approval' && c.isAdmin)) return bad('This document has already gone — make a new one to change it.')
    const { data: tpl } = doc.template_id ? await db.from('doc_templates').select('lock_mode').eq('id', doc.template_id).maybeSingle() : { data: null }
    const body = b.body != null ? settleBlanks(sanitizeHtml(String(b.body))).slice(0, 300_000) : doc.body
    const changed = !!doc.base_body && wordingText(body) !== wordingText(doc.base_body)
    if (changed && tpl?.lock_mode === 'locked' && !c.isAdmin) return bad('This template is locked — only the highlighted blanks can be changed.')
    const patch: any = {
      body, changed, updated_at: now,
      recipient_name: String(b.recipient_name ?? doc.recipient_name).trim().slice(0, 150) || doc.recipient_name,
      recipient_email: String(b.recipient_email ?? doc.recipient_email ?? '').trim().slice(0, 200) || null,
      email_subject: b.email_subject !== undefined ? String(b.email_subject).slice(0, 200) || null : doc.email_subject,
      email_message: b.email_message !== undefined ? String(b.email_message).slice(0, 2000) || null : doc.email_message,
      needs_signature: b.needs_signature !== undefined ? !!b.needs_signature : doc.needs_signature,
    }
    if (b.action === 'save') {
      const { data } = await db.from('doc_sends').update(patch).eq('id', doc.id).select('*').single()
      return NextResponse.json({ doc: data })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.recipient_email || '')) return bad('Add the email address to send it to.')
    const needsApproval = changed && tpl?.lock_mode === 'approval' && !c.isAdmin
    if (needsApproval) {
      const lines = changeSummary(doc.base_body, body)
      const { data: ap } = await db.from('approvals').insert({
        business_id: biz, kind: 'document', title: `Wording change: ${doc.title} for ${patch.recipient_name}`.slice(0, 200),
        details: `${by} changed the wording before sending:\n${lines.map(l => '• ' + l).join('\n')}\nIt sends automatically once approved.`.slice(0, 2000),
        module: 'company', property: doc.property_label, requested_by: by, requested_email: c.email, status: 'pending', ref_id: doc.id, link: `/staff-centre/documents?id=${doc.id}`,
      }).select('id').single()
      await db.from('notifications').insert({ user_id: biz, title: `Approval needed: wording change in ${doc.title}`.slice(0, 300), message: `${by} wants to send ${doc.title} to ${patch.recipient_name} with changed wording.`, type: 'approval', module: 'staffcentre', link: '/staff-centre/approvals', read: false })
      const { data } = await db.from('doc_sends').update({ ...patch, status: 'pending_approval', approval_id: ap?.id ?? null }).eq('id', doc.id).select('*').single()
      return NextResponse.json({ doc: data, pendingApproval: true, changes: lines })
    }
    const { data: saved } = await db.from('doc_sends').update(patch).eq('id', doc.id).select('*').single()
    const err = await deliverDocument(saved)
    if (err) return bad(err, /RESEND/.test(err) ? 503 : 400)
    if (doc.approval_id && doc.status === 'pending_approval') await db.from('approvals').update({ status: 'approved', decided_by: by, decided_at: now }).eq('id', doc.approval_id).eq('status', 'pending')
    const { data } = await db.from('doc_sends').select('*').eq('id', doc.id).single()
    return NextResponse.json({ doc: data })
  }
  if (b.action === 'remind') {
    if (!['sent', 'opened'].includes(doc.status)) return bad('Only documents waiting for a signature can be chased.')
    const err = await deliverDocument(doc, { reminder: true })
    return err ? bad(err) : NextResponse.json({ ok: true })
  }
  if (b.action === 'void') {
    if (!mine) return bad('Only the person who sent it or an admin can cancel it.', 403)
    if (doc.status === 'signed' && !c.isAdmin) return bad('Signed documents can only be cancelled by an admin.', 403)
    const { data } = await db.from('doc_sends').update({ status: 'void', updated_at: now }).eq('id', doc.id).select('*').single()
    if (doc.approval_id) await db.from('approvals').update({ status: 'rejected', decided_by: by, decided_at: now, decision_note: 'Document cancelled' }).eq('id', doc.approval_id).eq('status', 'pending')
    return NextResponse.json({ doc: data })
  }
  if (b.action === 'delete') {
    if (!mine) return bad('Only the person who made it or an admin can delete it.', 403)
    if (!['draft', 'rejected'].includes(doc.status)) return bad('Only drafts can be deleted — cancel a sent document instead.')
    await db.from('doc_sends').delete().eq('id', doc.id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
