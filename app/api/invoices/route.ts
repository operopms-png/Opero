import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { SITE_URL, EMAIL_DOMAIN } from '@/lib/brand'
import { sendEmail } from '@/lib/send-email'
import { invoicePdf, fmtMoney, fmtDate } from '@/lib/invoice-pdf'

// Finance → Invoices, in the Sangsters invoice format.
//   GET                       -> { invoices, settings, isAdmin }
//   GET ?id=…                 -> { invoice, settings }
//   GET ?id=…&pdf=1           -> the PDF (download)
//   GET ?people=text          -> { people: [...] } people to bill (contacts, tenants, owners, partners, guests, client owners)
//   POST {action:'save', id?, …fields}         create or update a draft/unpaid invoice (gets its number on first save)
//   POST {action:'send', id, to, message?}     email it with the PDF attached and a link to view it
//   POST {action:'paid'|'unpaid'|'void', id}   (admins)
//   POST {action:'delete', id}                 drafts only
//   POST {action:'settings', …}                the fixed parts — logo, contact lines, bank details, signature, terms (admins)
// Paid invoices count as money in on Finance → Overview.

export const maxDuration = 30
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const CURS = ['GBP', 'JMD', 'USD']
const SETTING_FIELDS = ['prefix', 'company_name', 'logo_url', 'logo_line1', 'logo_line2', 'contact_lines', 'payment_instructions', 'signature_name', 'signature_url', 'terms_note', 'reply_to']

async function settingsFor(biz: string) {
  let { data } = await db.from('invoice_settings').select('*').eq('business_id', biz).maybeSingle()
  if (!data) { await db.from('invoice_settings').insert({ business_id: biz }); ({ data } = await db.from('invoice_settings').select('*').eq('business_id', biz).maybeSingle()) }
  return data
}
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const withStatus = (i: any) => ({ ...i, shown_status: i.status === 'sent' && i.due_date && i.due_date < today() ? 'overdue' : i.status })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const sp = req.nextUrl.searchParams
  const settings = await settingsFor(c.businessId)

  if (sp.get('people') !== null) {
    const t = (sp.get('people') || '').trim()
    if (t.length < 2) return NextResponse.json({ people: [] })
    const like = `%${t}%`, biz = c.businessId
    const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])
    const [crm, pmT, eaT, pmL, eaL, partners, clients] = await Promise.all([
      q(db.from('crm_contacts').select('id,name,email,phone').eq('user_id', biz).ilike('name', like).limit(8)),
      q(db.from('pm_tenants').select('id,name,email,phone,property_id').eq('user_id', biz).ilike('name', like).limit(8)),
      q(db.from('estate_tenants').select('id,name,email,phone,property_id').eq('user_id', biz).ilike('name', like).limit(8)),
      q(db.from('pm_landlords').select('id,name,email,phone,address').eq('user_id', biz).ilike('name', like).limit(8)),
      q(db.from('estate_landlords').select('id,name,email,phone,address').eq('user_id', biz).ilike('name', like).limit(8)),
      q(db.from('partner_signups').select('id,name,email,phone').eq('business_id', biz).ilike('name', like).limit(8)),
      q(db.from('client_properties').select('id,owner_name,owner_email,owner_phone,address,subarea').eq('business_id', biz).ilike('owner_name', like).limit(8)),
    ])
    const pmIds = pmT.map((x: any) => x.property_id).filter(Boolean), eaIds = eaT.map((x: any) => x.property_id).filter(Boolean)
    const [pmP, eaP] = await Promise.all([
      pmIds.length ? q(db.from('pm_properties').select('id,name,address').in('id', pmIds)) : [],
      eaIds.length ? q(db.from('estate_properties').select('id,name,address').in('id', eaIds)) : [],
    ])
    const addr = (list: any[], id: string) => { const p = list.find((x: any) => x.id === id); return p ? (p.address || p.name) : null }
    const people = [
      ...pmT.map((x: any) => ({ kind: 'pm_tenant', label: 'Tenant · Property Management', id: x.id, name: x.name, email: x.email, phone: x.phone, address: addr(pmP, x.property_id), module: 'pm' })),
      ...eaT.map((x: any) => ({ kind: 'ea_tenant', label: 'Tenant · Estate Agency', id: x.id, name: x.name, email: x.email, phone: x.phone, address: addr(eaP, x.property_id), module: 'ea' })),
      ...pmL.map((x: any) => ({ kind: 'owner', label: 'Owner · Property Management', id: x.id, name: x.name, email: x.email, phone: x.phone, address: x.address, module: 'pm' })),
      ...eaL.map((x: any) => ({ kind: 'owner', label: 'Owner · Estate Agency', id: x.id, name: x.name, email: x.email, phone: x.phone, address: x.address, module: 'ea' })),
      ...clients.map((x: any) => ({ kind: 'client', label: `Client · ${x.address}`, id: x.id, name: x.owner_name, email: x.owner_email, phone: x.owner_phone, address: [x.address, x.subarea].filter(Boolean).join(', '), module: 'company' })),
      ...partners.map((x: any) => ({ kind: 'partner', label: 'Partner', id: x.id, name: x.name, email: x.email, phone: x.phone, address: null, module: 'company' })),
      ...crm.map((x: any) => ({ kind: 'crm', label: 'CRM contact', id: x.id, name: x.name, email: x.email, phone: x.phone, address: null, module: 'company' })),
    ].slice(0, 25)
    return NextResponse.json({ people })
  }

  const id = sp.get('id')
  if (id) {
    const { data: inv } = await db.from('invoices').select('*').eq('id', id).eq('business_id', c.businessId).maybeSingle()
    if (!inv) return bad('Invoice not found', 404)
    if (sp.get('pdf')) {
      const bytes = await invoicePdf(inv, settings, SITE_URL)
      return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${inv.number || 'invoice-draft'}.pdf"` } })
    }
    return NextResponse.json({ invoice: withStatus(inv), settings })
  }
  const { data, error } = await db.from('invoices').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(500)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ invoices: (data ?? []).map(withStatus), settings, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const by = c.name || c.email

  if (b.action === 'settings') {
    if (!c.isAdmin) return bad('Only admins can change the fixed parts of the invoice.', 403)
    const patch: any = { updated_at: new Date().toISOString() }
    for (const k of SETTING_FIELDS) if (b[k] !== undefined) patch[k] = b[k] === '' ? null : String(b[k]).slice(0, 3000)
    if (b.next_number !== undefined && Number.isInteger(Number(b.next_number)) && Number(b.next_number) > 0) patch.next_number = Number(b.next_number)
    await settingsFor(c.businessId)
    const { data, error } = await db.from('invoice_settings').update(patch).eq('business_id', c.businessId).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ settings: data })
  }

  if (b.action === 'save') {
    const items = (Array.isArray(b.items) ? b.items : []).map((i: any) => ({ description: String(i.description || '').slice(0, 300), qty: Math.max(0, Number(i.qty) || 0) || 1, amount: Number(String(i.amount ?? '').replace(/[^0-9.\-]/g, '')) || 0 })).filter((i: any) => i.description || i.amount)
    if (!String(b.bill_to_name || '').trim()) return bad('Choose who the invoice is for.')
    if (!items.length) return bad('Add at least one line.')
    const row: any = {
      bill_to_name: String(b.bill_to_name).trim().slice(0, 150), bill_to_phone: String(b.bill_to_phone || '').slice(0, 60) || null,
      bill_to_email: String(b.bill_to_email || '').trim().slice(0, 200) || null, bill_to_address: String(b.bill_to_address || '').slice(0, 300) || null,
      person_kind: b.person_kind || null, person_id: /^[0-9a-f-]{36}$/.test(b.person_id || '') ? b.person_id : null, module: b.module || 'company',
      issue_date: /^\d{4}-\d{2}-\d{2}$/.test(b.issue_date || '') ? b.issue_date : today(), due_date: /^\d{4}-\d{2}-\d{2}$/.test(b.due_date || '') ? b.due_date : null,
      currency: CURS.includes(b.currency) ? b.currency : 'GBP', items, total: Math.round(items.reduce((a: number, i: any) => a + i.qty * i.amount, 0) * 100) / 100,
      note: String(b.note || '').slice(0, 1000) || null, updated_at: new Date().toISOString(),
    }
    if (b.id) {
      const { data: cur } = await db.from('invoices').select('id,status').eq('id', b.id).eq('business_id', c.businessId).maybeSingle()
      if (!cur) return bad('Invoice not found', 404)
      if (cur.status === 'paid') return bad('This invoice is paid — mark it unpaid first to change it.')
      const { data, error } = await db.from('invoices').update(row).eq('id', cur.id).select('*').single()
      return error ? bad(error.message, 500) : NextResponse.json({ invoice: withStatus(data) })
    }
    const { data: num, error: nErr } = await db.rpc('next_invoice_number', { biz: c.businessId })
    if (nErr) return bad(nErr.message, 500)
    const { data, error } = await db.from('invoices').insert({ ...row, business_id: c.businessId, created_by: by, number: num, status: 'draft' }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ invoice: withStatus(data) })
  }

  const { data: inv } = await db.from('invoices').select('*').eq('id', String(b.id || '')).eq('business_id', c.businessId).maybeSingle()
  if (!inv) return bad('Invoice not found', 404)

  if (b.action === 'send') {
    const to = String(b.to || inv.bill_to_email || '').trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return bad('Add the email address to send it to.')
    const s = await settingsFor(c.businessId)
    const bytes = await invoicePdf(inv, s, SITE_URL)
    const link = `${SITE_URL}/invoice/${inv.token}`
    const first = String(inv.bill_to_name).split(/\s+/)[0]
    const msg = String(b.message || '').trim() || `Please find your invoice ${inv.number} for ${fmtMoney(inv.total, inv.currency)}${inv.due_date ? `, due ${fmtDate(inv.due_date)}` : ', due on receipt'}.`
    const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#323338">
      <div style="background:#191815;padding:16px 22px;color:#fff;font-weight:700;font-size:16px">${esc(s.company_name)}</div>
      <div style="padding:22px;font-size:14px;line-height:1.6">Hi ${esc(first)},<br><br>${esc(msg).replace(/\n/g, '<br>')}<br><br>
      <a href="${link}" style="display:inline-block;background:#A8862E;color:#fff;font-weight:700;padding:11px 20px;border-radius:6px;text-decoration:none">View invoice</a><br><br>
      <span style="font-size:12.5px;color:#676879">The invoice is attached as a PDF. Please use <b>${esc(inv.number)}</b> as your payment reference.</span></div>
      <div style="border-top:3px solid #C9A24A;padding:12px 22px;font-size:11px;color:#8A877F;background:#FAF8F3">${esc((s.contact_lines || '').split('\n').join(' · '))}</div></div>`
    const r = await sendEmail(to, `Invoice ${inv.number} from ${s.company_name}`, html, s.reply_to || undefined, `${s.company_name} <notifications@${EMAIL_DOMAIN}>`, [{ filename: `${inv.number}.pdf`, content: Buffer.from(bytes).toString('base64') }])
    if ((r as any).skipped) return bad('Email isn’t set up on the portal yet (RESEND_API_KEY missing in Netlify). Download the PDF and send it yourself for now.', 503)
    if ((r as any).error) return bad(`The email didn’t go: ${(r as any).error}`.slice(0, 400), 502)
    const { data } = await db.from('invoices').update({ status: inv.status === 'paid' ? 'paid' : 'sent', sent_at: new Date().toISOString(), sent_to: to, bill_to_email: inv.bill_to_email || to, updated_at: new Date().toISOString() }).eq('id', inv.id).select('*').single()
    return NextResponse.json({ invoice: withStatus(data) })
  }
  if (['paid', 'unpaid', 'void'].includes(b.action)) {
    if (!c.isAdmin) return bad('Only admins can mark invoices paid.', 403)
    const patch = b.action === 'paid' ? { status: 'paid', paid_at: new Date().toISOString(), paid_by: by } : b.action === 'void' ? { status: 'void' } : { status: inv.sent_at ? 'sent' : 'draft', paid_at: null, paid_by: null }
    const { data } = await db.from('invoices').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', inv.id).select('*').single()
    return NextResponse.json({ invoice: withStatus(data) })
  }
  if (b.action === 'delete') {
    if (inv.status !== 'draft') return bad('Only drafts can be deleted — void a sent invoice instead.')
    await db.from('invoices').delete().eq('id', inv.id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
