// Bill inbox: a supplier's emailed bill (JPS, Flow…) sent to an account's own address is read and logged by itself. Server only.
// Each bill account has an address bills+<inbox_token>@<EMAIL_DOMAIN>. The owner points the supplier's e-bill email, or a forwarding rule, at it.
import { randomUUID } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { EMAIL_DOMAIN } from '@/lib/brand'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { logAiUsage } from '@/lib/ai-usage'

// BILL_INBOX_DOMAIN is the domain that receives inbound mail (for example reply.helloopero.com); it falls back to EMAIL_DOMAIN. Sending stays on EMAIL_DOMAIN.
export const billAddress = (token: string) => `bills+${token}@${process.env.BILL_INBOX_DOMAIN || EMAIL_DOMAIN}`
export const BILL_ALIAS = /bills\+([a-f0-9]{12})@/i
const MODEL = 'claude-sonnet-4-6'
const SYSTEM = `You read a utility or internet bill that arrived by email (JPS electricity, Flow internet, water, etc.). Reply with ONLY a JSON object:
{"is_bill": true|false, "amount": number, "currency": "JMD"|"GBP"|"USD"|null, "bill_date": "YYYY-MM-DD"|null, "due_date": "YYYY-MM-DD"|null, "usage": number|null, "usage_unit": "kWh"|"GB"|"m3"|null, "account_number": string|null}
amount is the total amount due on this bill (not the previous balance or a payment received). is_bill is false for receipts, marketing, outage notices or anything that is not a bill for payment. Use null when a value is not on the bill. Never guess.`

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null)
const date = (v: any) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? v : null)
const digits = (s: string) => s.replace(/\D/g, '')

async function notify(biz: string, title: string, message: string) {
  await db.from('notifications').insert({ user_id: biz, title, message, type: 'utility', module: 'pm', link: '/pm?tab=Utilities' }).then(() => {}, () => {})
}

/** Called by the Resend inbound webhook for an email sent to bills+<token>@… Returns what happened. */
export async function handleBillEmail(emailId: string, token: string, from: string, subject: string): Promise<string> {
  const { data: acct } = await db.from('pm_utilities').select('id, user_id, property_id, service, supplier, account_reference').eq('inbox_token', token.toLowerCase()).maybeSingle()
  if (!acct) return 'no account'
  const { data: prop } = await db.from('pm_properties').select('name, currency').eq('id', acct.property_id).maybeSingle()
  const label = `${acct.supplier || acct.service} ${/broad/i.test(acct.service) ? 'internet' : acct.service.toLowerCase()} · ${prop?.name || 'property'}`
  if (!process.env.RESEND_API_KEY) { await notify(acct.user_id, 'Bill arrived but could not be read', `A bill emailed for ${label} could not be read because email is not set up.`); return 'not configured' }

  // The email body and any PDF or photo attached
  const rr = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } })
  if (!rr.ok) { await notify(acct.user_id, 'Bill arrived but could not be read', `A bill emailed for ${label} could not be fetched. Please add it by hand.`); return 'fetch failed' }
  const full = await rr.json()
  const text = String(full.text || full.html || '').replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000)
  const blocks: any[] = []; let file: { buf: Buffer; mime: string; name: string } | null = null
  for (const a of (Array.isArray(full.attachments) ? full.attachments : []).slice(0, 3)) {
    const mime = String(a.content_type || a.contentType || '').toLowerCase()
    if (!(mime === 'application/pdf' || /^image\/(jpeg|png|webp)$/.test(mime))) continue
    try {
      let url = a.download_url || a.url
      if (!url && a.id) { const m = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${a.id}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }); if (m.ok) url = (await m.json()).download_url }
      if (!url) continue
      const f = await fetch(url); if (!f.ok) continue
      const buf = Buffer.from(await f.arrayBuffer()); if (buf.length > 12 * 1024 * 1024) continue
      blocks.push(mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } } : { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } })
      if (!file) file = { buf, mime, name: String(a.filename || 'Bill').slice(0, 120) }
    } catch { /* try the next one */ }
  }
  if (!text && !blocks.length) { await notify(acct.user_id, 'Bill arrived but was empty', `An email for ${label} had no readable bill.`); return 'empty' }

  // A supplier's confirmation code (sent when you set this address as the bill email): show it in a notification so it can be typed into the supplier's app.
  const codeLike = !blocks.length && text.length < 1500 && /(code|otp|verif|confirm)/i.test(`${subject} ${text}`) ? text.match(/(?<!\d)\d{4,10}(?!\d)/) : null
  if (codeLike) { await notify(acct.user_id, `Confirmation code: ${label}`, `${acct.supplier || 'Your supplier'} sent the code ${codeLike[0]}. Type it into their app to finish setting up bill emails.`); return 'verification' }
  if (!process.env.ANTHROPIC_API_KEY) { await notify(acct.user_id, 'Bill arrived but could not be read', `A bill emailed for ${label} could not be read because AI is not set up.`); return 'not configured' }

  let data: any
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages: [{ role: 'user', content: [...blocks, { type: 'text', text: `Subject: ${subject}\n\n${text || '(see attachment)'}` }] }] }) })
    if (!res.ok) throw new Error(String(res.status))
    data = await res.json(); logAiUsage(acct.user_id, 'Utility bills', MODEL, data)
  } catch { await notify(acct.user_id, 'Bill arrived but could not be read', `A bill emailed for ${label} could not be read. Please add it by hand.`); return 'ai failed' }
  const raw = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('')
  let out: any = null; try { out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) } catch { /* handled below */ }
  const amount = num(out?.amount), due = date(out?.due_date), billDate = date(out?.bill_date) || new Date().toISOString().slice(0, 10)
  if (!out?.is_bill || amount == null || amount <= 0 || amount > 10_000_000) { await notify(acct.user_id, 'Email was not read as a bill', `An email for ${label} did not look like a bill, or the amount was unclear. Please check it.`); return 'not a bill' }
  // Safety checks: the right account and the right currency, otherwise a person decides
  const ref = digits(String(acct.account_reference || '')), got = digits(String(out.account_number || ''))
  if (ref.length >= 4 && got.length >= 4 && !ref.includes(got) && !got.includes(ref)) { await notify(acct.user_id, 'Bill is for a different account', `A bill for account ${out.account_number} arrived at ${label}, which is account ${acct.account_reference}. It was not added.`); return 'account mismatch' }
  const cur = out.currency && String(out.currency).toUpperCase(), pcur = String(prop?.currency || 'GBP').toUpperCase()
  if (cur && cur !== pcur) { await notify(acct.user_id, 'Bill is in a different currency', `A ${cur} bill of ${amount} arrived for ${label}, but this property uses ${pcur}. It was not added.`); return 'currency mismatch' }
  const { data: dup } = await db.from('pm_utility_bills').select('id').eq('utility_id', acct.id).eq('period_end', billDate).eq('amount', amount).maybeSingle()
  if (dup) return 'duplicate'

  let bill_path: string | null = null, bill_name: string | null = null
  if (file) {
    const ext = file.mime === 'application/pdf' ? 'pdf' : file.mime.split('/')[1]; const path = `${acct.user_id}/utility/${acct.id}/${randomUUID()}.${ext}`
    const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, file.buf, { contentType: file.mime, upsert: false }); if (!up.error) { bill_path = path; bill_name = file.name }
  }
  const { error } = await db.from('pm_utility_bills').insert({ user_id: acct.user_id, utility_id: acct.id, property_id: acct.property_id, period_end: billDate, amount, usage: num(out.usage), usage_unit: out.usage_unit ? String(out.usage_unit).slice(0, 12) : null, due_date: due, paid: false, bill_path, bill_name, source: 'email', source_from: from.slice(0, 200) })
  if (error) { if (bill_path) await db.storage.from(LEASE_DOC_BUCKET).remove([bill_path]); await notify(acct.user_id, 'Bill could not be saved', `A bill for ${label} was read but could not be saved. Please add it by hand.`); return 'save failed' }
  if (due) await db.from('pm_utilities').update({ next_bill_date: due }).eq('id', acct.id)
  const sym = pcur === 'JMD' ? 'J$' : '£'
  await notify(acct.user_id, `New bill: ${label}`, `${sym}${amount.toLocaleString('en-GB')}${due ? ` due ${due}` : ''} was added automatically from an emailed bill.`)
  return 'added'
}
