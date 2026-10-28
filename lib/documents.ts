// Documents — server side: who a document can go to, the values that fill its
// blanks, sending it (email + PDF + signing link), reminders, and the automatic rules.
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL, EMAIL_DOMAIN } from '@/lib/brand'
import { sendEmail } from '@/lib/send-email'
import { documentPdf } from '@/lib/document-pdf'
import { esc, fillBody, emptyBlanks, BLANKS, blankLabel } from '@/lib/doc-text'

const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
const one = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? null).catch(() => null)
const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const money = (n: any, cur: string) => n == null || n === '' ? '' : (SYM[cur] ?? '') + Number(n).toLocaleString('en-GB', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })
export const longDate = (d?: string | null) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
export const todayJm = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const months = (a?: string | null, b?: string | null) => { if (!a || !b) return ''; const x = new Date(a), y = new Date(b); const m = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth() + (y.getUTCDate() >= x.getUTCDate() - 1 ? 0 : -1); return m > 0 ? String(m) : '' }

export const PERSON_KINDS: Record<string, string> = {
  pm_tenant: 'Tenant · Property Management', ea_tenant: 'Tenant · Estate Agency', pm_owner: 'Owner · Property Management', ea_owner: 'Owner · Estate Agency',
  client: 'Client property owner', partner: 'Partner', guest: 'Guest', crm: 'CRM contact',
}

export async function docSettings(biz: string) {
  let s = await one(db.from('invoice_settings').select('company_name,logo_url,contact_lines,reply_to').eq('business_id', biz).maybeSingle())
  if (!s) s = { company_name: 'NOVOURQ Group', logo_url: '/sangsters-logo.jpg', contact_lines: '', reply_to: null }
  return s as { company_name: string; logo_url: string | null; contact_lines: string | null; reply_to: string | null }
}

async function bizPropertyIds(biz: string) {
  return (await q(db.from('properties').select('id,name,address').or(`user_id.eq.${biz},company_id.eq.${biz}`))) as any[]
}

/** People a document can be sent to, matching the search text. */
export async function searchPeople(biz: string, text: string) {
  const t = text.trim(); if (t.length < 2) return []
  const like = `%${t}%`
  const props = await bizPropertyIds(biz)
  const [crm, pmT, eaT, pmL, eaL, partners, clients, guests] = await Promise.all([
    q(db.from('crm_contacts').select('id,name,email,phone').eq('user_id', biz).ilike('name', like).limit(6)),
    q(db.from('pm_tenants').select('id,name,email,phone,property_id').eq('user_id', biz).ilike('name', like).limit(8)),
    q(db.from('estate_tenants').select('id,name,email,phone,property_id').eq('user_id', biz).ilike('name', like).limit(8)),
    q(db.from('pm_landlords').select('id,name,email,phone').eq('user_id', biz).ilike('name', like).limit(6)),
    q(db.from('estate_landlords').select('id,name,email,phone').eq('user_id', biz).ilike('name', like).limit(6)),
    q(db.from('partner_signups').select('id,name,email,phone').eq('business_id', biz).ilike('name', like).limit(6)),
    q(db.from('client_properties').select('id,owner_name,owner_email,owner_phone,address').eq('business_id', biz).or(`owner_name.ilike.${like},address.ilike.${like}`).limit(6)),
    props.length ? q(db.from('bookings').select('id,guest_name,guest_email,guest_phone,property_id,check_in').in('property_id', props.map(p => p.id)).ilike('guest_name', like).order('check_in', { ascending: false }).limit(6)) : [],
  ])
  const pmIds = pmT.map((x: any) => x.property_id).filter(Boolean), eaIds = eaT.map((x: any) => x.property_id).filter(Boolean)
  const [pmP, eaP] = await Promise.all([
    pmIds.length ? q(db.from('pm_properties').select('id,name,address').in('id', pmIds)) : [],
    eaIds.length ? q(db.from('estate_properties').select('id,name,address').in('id', eaIds)) : [],
  ])
  const nm = (list: any[], id: string) => { const p = list.find((x: any) => x.id === id); return p ? (p.name || p.address) : null }
  return [
    ...pmT.map((x: any) => ({ kind: 'pm_tenant', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: nm(pmP, x.property_id) })),
    ...eaT.map((x: any) => ({ kind: 'ea_tenant', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: nm(eaP, x.property_id) })),
    ...pmL.map((x: any) => ({ kind: 'pm_owner', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: null })),
    ...eaL.map((x: any) => ({ kind: 'ea_owner', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: null })),
    ...clients.map((x: any) => ({ kind: 'client', id: x.id, name: x.owner_name, email: x.owner_email, phone: x.owner_phone, sub: x.address })),
    ...guests.map((x: any) => ({ kind: 'guest', id: x.id, name: x.guest_name, email: x.guest_email, phone: x.guest_phone, sub: [nm(props, x.property_id), longDate(x.check_in)].filter(Boolean).join(' · ') })),
    ...partners.map((x: any) => ({ kind: 'partner', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: null })),
    ...crm.map((x: any) => ({ kind: 'crm', id: x.id, name: x.name, email: x.email, phone: x.phone, sub: null })),
  ].map(p => ({ ...p, label: PERSON_KINDS[p.kind] })).slice(0, 30)
}

/** Everything we know that can fill a blank, for one person (plus the staff member sending). */
export async function fieldsFor(biz: string, kind: string | null, id: string | null, staff?: { name?: string; email?: string }, extra: Record<string, any> = {}) {
  const s = await docSettings(biz)
  const v: Record<string, any> = { today: longDate(todayJm()), company_name: s.company_name || 'NOVOURQ Group', staff_name: staff?.email ? staff?.name || '' : '', staff_email: staff?.email || '', manager_name: staff?.email ? staff?.name || '' : '', manager_email: staff?.email || '' }
  let property_label = ''
  const person = (p: any, name = p?.name) => { if (!p) return; v.recipient_name = name || ''; v.recipient_email = p.email || ''; v.recipient_phone = p.phone || ''; if (p.address) v.recipient_address = p.address }
  const pmCur = (p: any) => /jamaica/i.test(p?.country || '') ? 'JMD' : 'GBP'
  if (kind && id && /^[0-9a-f-]{36}$/.test(id)) {
    if (kind === 'pm_tenant') {
      const t = await one(db.from('pm_tenants').select('*').eq('id', id).eq('user_id', biz).maybeSingle()); person(t)
      const p = t?.property_id ? await one(db.from('pm_properties').select('id,name,address,city,country,owner_id').eq('id', t.property_id).maybeSingle()) : null
      const l = await one(db.from('pm_leases').select('*').eq('tenant_id', id).order('start_date', { ascending: false }).limit(1).maybeSingle())
      const ll = p?.owner_id ? await one(db.from('pm_landlords').select('name').eq('id', p.owner_id).maybeSingle()) : null
      if (p) { v.property_address = [p.address || p.name, p.city].filter(Boolean).join(', '); property_label = p.name || p.address }
      if (ll) v.landlord_name = ll.name
      if (l) { const c = pmCur(p); Object.assign(v, { rent: money(l.monthly_rent, c), deposit: money(l.deposit, c), start_date: longDate(l.start_date), end_date: longDate(l.end_date), term_months: months(l.start_date, l.end_date) }) }
    } else if (kind === 'ea_tenant') {
      const t = await one(db.from('estate_tenants').select('*').eq('id', id).eq('user_id', biz).maybeSingle()); person(t)
      const tn = await one(db.from('estate_tenancies').select('*').eq('tenant_id', id).order('start_date', { ascending: false }).limit(1).maybeSingle())
      const pid = tn?.property_id || t?.property_id
      const p = pid ? await one(db.from('estate_properties').select('id,name,address,currency,owner_id').eq('id', pid).maybeSingle()) : null
      const ll = p?.owner_id ? await one(db.from('estate_landlords').select('name').eq('id', p.owner_id).maybeSingle()) : null
      if (p) { v.property_address = p.address || p.name; property_label = p.name || p.address }
      if (ll) v.landlord_name = ll.name
      if (tn) { const c = p?.currency || 'GBP'; Object.assign(v, { rent: money(tn.rent, c), deposit: money(tn.deposit, c), start_date: longDate(tn.start_date), end_date: longDate(tn.end_date), term_months: months(tn.start_date, tn.end_date) }) }
    } else if (kind === 'pm_owner' || kind === 'ea_owner') {
      const pm = kind === 'pm_owner'
      const o = await one(db.from(pm ? 'pm_landlords' : 'estate_landlords').select('*').eq('id', id).eq('user_id', biz).maybeSingle()); person(o)
      if (o) v.landlord_name = o.name
      const p = await one(db.from(pm ? 'pm_properties' : 'estate_properties').select('name,address').eq('owner_id', id).limit(1).maybeSingle())
      if (p) { v.property_address = p.address || p.name; property_label = p.name || p.address }
    } else if (kind === 'client') {
      const c = await one(db.from('client_properties').select('*').eq('id', id).eq('business_id', biz).maybeSingle())
      if (c) { person({ email: c.owner_email, phone: c.owner_phone }, c.owner_name); v.landlord_name = c.owner_name; v.property_address = [c.address, c.subarea, c.area].filter(Boolean).join(', '); property_label = c.address }
    } else if (kind === 'partner') {
      person(await one(db.from('partner_signups').select('*').eq('id', id).eq('business_id', biz).maybeSingle()))
    } else if (kind === 'crm') {
      person(await one(db.from('crm_contacts').select('*').eq('id', id).eq('user_id', biz).maybeSingle()))
    } else if (kind === 'guest') {
      const b = await one(db.from('bookings').select('*').eq('id', id).maybeSingle())
      const p = b?.property_id ? await one(db.from('properties').select('name,address,city,user_id,company_id').eq('id', b.property_id).maybeSingle()) : null
      if (b && p && (p.user_id === biz || p.company_id === biz)) {
        person({ email: b.guest_email, phone: b.guest_phone }, b.guest_name)
        Object.assign(v, { check_in: longDate(b.check_in), check_out: longDate(b.check_out), booking_total: money(b.total_amount, 'USD'), property_address: [p.address || p.name, p.city].filter(Boolean).join(', ') })
        property_label = p.name
      }
    }
  }
  if (v.recipient_name) v.first_name = String(v.recipient_name).replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '').split(/\s+/)[0]
  Object.assign(v, extra)
  return { values: v, property_label }
}

export function docEmailHtml(company: string, contact: string | null, first: string, message: string, link: string, button: string, foot: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#323338">
  <div style="background:#191815;padding:16px 22px;color:#fff;font-weight:700;font-size:16px">${esc(company)}</div>
  <div style="padding:22px;font-size:14px;line-height:1.6">Hi ${esc(first)},<br><br>${esc(message).replace(/\n/g, '<br>')}<br><br>
  <a href="${link}" style="display:inline-block;background:#89CFF0;color:#fff;font-weight:700;padding:11px 20px;border-radius:6px;text-decoration:none">${esc(button)}</a><br><br>
  <span style="font-size:12.5px;color:#676879">${foot}</span></div>
  <div style="border-top:3px solid #89CFF0;padding:12px 22px;font-size:11px;color:#8A877F;background:#FAF8F3">${esc((contact || '').split('\n').filter(Boolean).join(' · '))}</div></div>`
}

/** Email the document (PDF attached, link to read and sign). Returns an error message or null. */
export async function deliverDocument(doc: any, opts: { reminder?: boolean } = {}): Promise<string | null> {
  const to = String(doc.recipient_email || '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return 'Add the email address to send it to.'
  const s = await docSettings(doc.business_id)
  const company = s.company_name || 'NOVOURQ Group'
  const bytes = await documentPdf(doc, s, SITE_URL)
  const link = `${SITE_URL}/sign/${doc.token}`
  const parts = String(doc.recipient_name || '').trim().split(/\s+/)
  const first = /^(mr|mrs|ms|miss|dr)\.?$/i.test(parts[0]) ? parts.slice(0, 2).join(' ') : parts[0]   // keeps "Mr. Campbell"
  const msg = opts.reminder
    ? `Just a reminder — your ${doc.title}${doc.property_label ? ` for ${doc.property_label}` : ''} is still waiting for your signature. It only takes a minute.`
    : (String(doc.email_message || '').trim() || `Please find your ${doc.title}${doc.property_label ? ` for ${doc.property_label}` : ''}. ${doc.needs_signature ? 'You can read it and sign online in a couple of minutes.' : 'You can read it online or open the PDF attached.'}`)
  const subject = opts.reminder ? `Reminder: ${doc.title} is waiting for your signature` : (String(doc.email_subject || '').trim() || `${doc.title}${doc.property_label ? ` — ${doc.property_label}` : ''}`)
  const html = docEmailHtml(company, s.contact_lines, first, msg, link, doc.needs_signature ? 'Review and sign' : 'View document', 'A PDF copy is attached. Questions? Just reply to this email.')
  const r = await sendEmail(to, subject, html, doc.created_email || s.reply_to || undefined, `${company} <notifications@${EMAIL_DOMAIN}>`, [{ filename: `${String(doc.title).replace(/[^\w\- ]+/g, '').trim() || 'document'}.pdf`, content: Buffer.from(bytes).toString('base64') }])
  if ((r as any).skipped) return 'Email isn’t set up on the portal yet (RESEND_API_KEY missing in Netlify). Download the PDF and send it yourself for now.'
  if ((r as any).error) return `The email didn’t go: ${(r as any).error}`.slice(0, 400)
  const now = new Date().toISOString()
  if (opts.reminder) await db.from('doc_sends').update({ last_reminder_at: now, reminders: (doc.reminders || 0) + 1 }).eq('id', doc.id)
  else await db.from('doc_sends').update({ status: 'sent', sent_at: now, updated_at: now }).eq('id', doc.id)
  return null
}

/** Make a document from a template for one person (used by sending and by automatic rules). */
export async function createFromTemplate(biz: string, tpl: any, kind: string | null, id: string | null, by: { name?: string; email?: string }, extra: Record<string, any> = {}, ruleId?: string) {
  const { values, property_label } = await fieldsFor(biz, kind, id, by, extra)
  const body = fillBody(tpl.body, values, tpl.defaults || {})
  const { data, error } = await db.from('doc_sends').insert({
    business_id: biz, template_id: tpl.id, title: tpl.name, body, base_body: body, person_kind: kind, person_id: id,
    recipient_name: values.recipient_name || 'Recipient', recipient_email: values.recipient_email || null, property_label: property_label || null,
    email_subject: tpl.email_subject || null, email_message: tpl.email_message || null, needs_signature: tpl.needs_signature, remind_days: tpl.remind_days,
    created_by: by.name || by.email || 'Automatic', created_email: by.email || null, rule_id: ruleId || null,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data
}

// blanks the person receiving the document fills in themselves when signing
const CLIENT_KEYS = new Set(BLANKS.filter(b => b.group === 'Usually the client fills in').map(b => b.key))

export const TRIGGERS: Record<string, { label: string; to: string; area: string }> = {
  booking_confirmed: { label: 'Booking confirmed', to: 'Guest', area: 'Vacation Rentals' },
  pm_tenant_added: { label: 'New tenant added', to: 'Tenant', area: 'Property Management' },
  ea_tenancy_created: { label: 'New tenancy created', to: 'Tenant', area: 'Estate Agency' },
  client_signed: { label: 'Client property signed', to: 'Owner', area: 'Client Properties' },
  partner_paid: { label: 'Partner paid', to: 'Partner', area: 'Partners' },
  rent_late_7: { label: 'Rent 7 days late', to: 'Tenant', area: 'Property Management' },
  lease_ending_60: { label: 'Lease ends in 60 days', to: 'Tenant', area: 'Property Management' },
}

/** Find what each enabled rule should send, send it once, and send signature reminders. */
export async function runDocAutomation(onlyBiz?: string) {
  const report: any[] = []
  let rq = db.from('doc_rules').select('*, doc_templates(*)').eq('enabled', true)
  if (onlyBiz) rq = rq.eq('business_id', onlyBiz)
  const rules = (await q(rq)) as any[]
  const today = todayJm()
  const addDays = (d: string, n: number) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
  for (const r of rules) {
    const tpl = r.doc_templates, biz = r.business_id, since = r.enabled_at || r.created_at, sinceDay = String(since).slice(0, 10)
    if (!tpl || !tpl.active) continue
    let cands: { source: string; kind: string; id: string; email?: string | null; extra?: any }[] = []
    if (r.trigger === 'booking_confirmed') {
      const props = await bizPropertyIds(biz)
      if (props.length) cands = (await q(db.from('bookings').select('id,guest_email,status,created_at').in('property_id', props.map(p => p.id)).gte('created_at', since).limit(200)))
        .filter((b: any) => !/cancel/i.test(b.status || '')).map((b: any) => ({ source: b.id, kind: 'guest', id: b.id, email: b.guest_email }))
    } else if (r.trigger === 'pm_tenant_added') {
      cands = (await q(db.from('pm_tenants').select('id,email').eq('user_id', biz).gte('created_at', since).limit(200))).map((t: any) => ({ source: t.id, kind: 'pm_tenant', id: t.id, email: t.email }))
    } else if (r.trigger === 'ea_tenancy_created') {
      const ts = await q(db.from('estate_tenancies').select('id,tenant_id').eq('user_id', biz).gte('created_at', since).limit(200))
      const ten = ts.length ? await q(db.from('estate_tenants').select('id,email').in('id', ts.map((x: any) => x.tenant_id).filter(Boolean))) : []
      cands = ts.filter((x: any) => x.tenant_id).map((x: any) => ({ source: x.id, kind: 'ea_tenant', id: x.tenant_id, email: ten.find((t: any) => t.id === x.tenant_id)?.email }))
    } else if (r.trigger === 'client_signed') {
      cands = (await q(db.from('client_properties').select('id,owner_email').eq('business_id', biz).gte('signed_at', since).limit(200))).map((c: any) => ({ source: c.id, kind: 'client', id: c.id, email: c.owner_email }))
    } else if (r.trigger === 'partner_paid') {
      cands = (await q(db.from('partner_signups').select('id,email').eq('business_id', biz).gte('paid_at', since).limit(200))).map((p: any) => ({ source: p.id, kind: 'partner', id: p.id, email: p.email }))
    } else if (r.trigger === 'rent_late_7') {
      // only rent that became 7 days late after the rule was switched on — old arrears are left alone
      const pays = await q(db.from('pm_rent_payments').select('id,tenant_id,amount,due_date,status,property_id').eq('user_id', biz).lte('due_date', addDays(today, -7)).gte('due_date', addDays(sinceDay, -7)).limit(200))
      const unpaid = pays.filter((p: any) => !/paid/i.test(p.status || '') && p.tenant_id)
      const ten = unpaid.length ? await q(db.from('pm_tenants').select('id,email').in('id', unpaid.map((p: any) => p.tenant_id))) : []
      const props = unpaid.length ? await q(db.from('pm_properties').select('id,country').in('id', unpaid.map((p: any) => p.property_id).filter(Boolean))) : []
      cands = unpaid.map((p: any) => { const c = /jamaica/i.test(props.find((x: any) => x.id === p.property_id)?.country || '') ? 'JMD' : 'GBP'; return { source: p.id, kind: 'pm_tenant', id: p.tenant_id, email: ten.find((t: any) => t.id === p.tenant_id)?.email, extra: { amount_due: money(p.amount, c), due_date: longDate(p.due_date) } } })
    } else if (r.trigger === 'lease_ending_60') {
      // only leases that reach the 60-day mark after the rule was switched on
      const ls = await q(db.from('pm_leases').select('id,tenant_id,end_date,status').eq('user_id', biz).gte('end_date', addDays(sinceDay, 59)).lte('end_date', addDays(today, 60)).limit(200))
      const live = ls.filter((l: any) => l.tenant_id && !/ended|terminated|cancel/i.test(l.status || ''))
      const ten = live.length ? await q(db.from('pm_tenants').select('id,email').in('id', live.map((l: any) => l.tenant_id))) : []
      cands = live.map((l: any) => ({ source: l.id, kind: 'pm_tenant', id: l.tenant_id, email: ten.find((t: any) => t.id === l.tenant_id)?.email }))
    }
    const done = new Set(((await q(db.from('doc_rule_log').select('source_id').eq('rule_id', r.id))) as any[]).map(x => x.source_id))
    let sent = 0, skipped = 0, drafted = 0
    for (const c of cands.filter(c => !done.has(c.source)).slice(0, 25)) {
      if (!c.email) { await db.from('doc_rule_log').insert({ rule_id: r.id, source_id: c.source, note: 'No email address' }); skipped++; continue }
      try {
        const doc = await createFromTemplate(biz, tpl, c.kind, c.id, { name: 'Automatic' }, c.extra, r.id)
        // blanks only staff can know (not choices, not the client's own details) → leave it as a draft for staff to finish
        const missing = emptyBlanks(doc.body).filter(b => !b.options && !CLIENT_KEYS.has(b.key))
        if (missing.length) {
          await db.from('doc_rule_log').insert({ rule_id: r.id, source_id: c.source, send_id: doc.id, note: 'Left as a draft — needs ' + missing.map(m => blankLabel(m.key)).join(', ') })
          await db.from('notifications').insert({ user_id: biz, title: `Document to finish: ${tpl.name} for ${doc.recipient_name}`.slice(0, 300), message: `Fill in ${missing.map(m => blankLabel(m.key)).join(', ')} and send it.`, type: 'document', module: 'staffcentre', link: `/staff-centre/documents?id=${doc.id}`, read: false })
          drafted++; continue
        }
        const err = await deliverDocument(doc)
        if (err && /RESEND_API_KEY/.test(err)) { await db.from('doc_sends').delete().eq('id', doc.id); report.push({ rule: r.id, error: err }); break } // email not set up yet — try again next run
        await db.from('doc_rule_log').insert({ rule_id: r.id, source_id: c.source, send_id: doc.id, note: err })
        if (!err) sent++
      } catch (e: any) { report.push({ rule: r.id, error: e.message }) }
    }
    await db.from('doc_rules').update({ last_run_at: new Date().toISOString(), sent_count: (r.sent_count || 0) + sent }).eq('id', r.id)
    report.push({ rule: r.id, trigger: r.trigger, found: cands.length, sent, skipped, drafted })
  }

  // reminders for unsigned documents (at most 3 per document)
  let dq = db.from('doc_sends').select('*').in('status', ['sent', 'opened']).eq('needs_signature', true).gt('remind_days', 0).lt('reminders', 3)
  if (onlyBiz) dq = dq.eq('business_id', onlyBiz)
  const waiting = (await q(dq)) as any[]
  let reminded = 0
  for (const d of waiting) {
    const last = new Date(d.last_reminder_at || d.sent_at || d.created_at).getTime()
    if (Date.now() - last < d.remind_days * 86400000) continue
    if (!(await deliverDocument(d, { reminder: true }))) reminded++
    if (reminded >= 50) break
  }
  report.push({ reminders: reminded })
  return report
}
