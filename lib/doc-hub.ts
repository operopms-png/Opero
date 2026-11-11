// Document hub: who still owes documents, chase emails and the automatic reminders. Server-only.
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL, EMAIL_DOMAIN } from '@/lib/brand'
import { sendEmail } from '@/lib/send-email'
import { docSettings, docEmailHtml } from '@/lib/documents'
import { ensureLink, linkUrl } from '@/lib/client-link'
import { DOC_SETS, DOC_SUBJECT_TABLE, keyDocs, type DocSubject } from '@/lib/lease-doc-types'

export type PortalSubject = Exclude<DocSubject, 'head_lease'>
export const PORTAL_SUBJECTS: PortalSubject[] = ['landlord', 'tenant', 'ea_landlord', 'ea_tenant', 'cohost']
export const PORTAL_PATH: Record<PortalSubject, string> = { landlord: '/pm-owner-portal', tenant: '/pm-tenant-portal', ea_landlord: '/estate-owner-portal', ea_tenant: '/estate-tenant-portal', cohost: '/cohost-portal' }
export const WHO: Record<PortalSubject, string> = { landlord: 'Owner', tenant: 'Tenant', ea_landlord: 'Owner (Estate Agency)', ea_tenant: 'Tenant (Estate Agency)', cohost: 'Co-host' }
export const REMIND_EVERY_DAYS = 3, MAX_REMINDERS = 5

/** Key documents with no pending or approved file yet (rejected files do not count as received). */
export function missingKeys(subject: PortalSubject, rows: { category: string; status: string }[]) {
  const have = new Set(rows.filter(r => r.status !== 'rejected').map(r => r.category))
  return keyDocs(subject).filter(t => !t.byUs && !have.has(t.key))
}

export async function emailPerson(biz: string, subject: PortalSubject, person: { name: string; email: string }, headline: string, lines: string[], button = 'Open your documents', url = '') {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(person.email || '')) return false
  const s = await docSettings(biz), company = s.company_name || 'NOVOURQ Group'
  const first = String(person.name || '').trim().split(/\s+/)[0] || 'there'
  const html = docEmailHtml(company, s.contact_lines, first, `${headline}\n\n${lines.map(l => '• ' + l).join('\n')}`, url || `${SITE_URL}${PORTAL_PATH[subject]}`, button, url ? 'This link is private to you. Open it on your phone, take a photo or upload each file. It only takes a minute.' : 'Sign in to your portal, open Documents, and take a photo or upload the file. It only takes a minute.')
  const r: any = await sendEmail(person.email, headline, html, s.reply_to || undefined, `${company} <notifications@${EMAIL_DOMAIN}>`)
  return !r?.skipped && !r?.error
}

/** Ask one person for what is missing. kind 'request' is the first ask, 'reminder' the automatic ones. */
export async function chasePerson(biz: string, subject: PortalSubject, id: string, kind: 'request' | 'reminder' = 'request') {
  const { data: p } = await db.from(DOC_SUBJECT_TABLE[subject]).select('id, name, email').eq('id', id).eq('user_id', biz).maybeSingle()
  if (!p) return { ok: false, reason: 'not found' }
  const { data: rows } = await db.from('lease_documents').select('category, status').eq('subject', subject).eq('head_lease_id', id).eq('user_id', biz)
  const miss = missingKeys(subject, rows ?? [])
  if (!miss.length) return { ok: false, reason: 'complete' }
  let url = ''; try { url = linkUrl((await ensureLink(biz, subject, id)).token) } catch { /* falls back to the portal sign-in */ }
  const sent = await emailPerson(biz, subject, p, kind === 'reminder' ? 'Reminder: documents we still need from you' : 'Documents we need from you', miss.map(m => `${m.label} (${m.hint})`), 'Open your documents', url)
  if (sent) await db.from('doc_chases').insert({ user_id: biz, subject, subject_id: id, kind })
  return { ok: sent, reason: sent ? '' : 'no email address or email is not set up' }
}

/** Daily: remind everyone who has been asked, still owes documents, and has not been nudged in the last 3 days. */
export async function runDocReminders() {
  const { data: asked } = await db.from('doc_chases').select('user_id, subject, subject_id, sent_at').order('sent_at', { ascending: false }).limit(5000)
  const seen = new Map<string, { biz: string; subject: PortalSubject; id: string; last: number; n: number }>()
  for (const r of asked ?? []) {
    const k = r.subject + r.subject_id, t = new Date(r.sent_at).getTime()
    const e = seen.get(k)
    if (!e) seen.set(k, { biz: r.user_id, subject: r.subject, id: r.subject_id, last: t, n: 1 }); else e.n++
  }
  let reminded = 0
  for (const e of seen.values()) {
    if (!PORTAL_SUBJECTS.includes(e.subject) || e.n > MAX_REMINDERS) continue
    if (Date.now() - e.last < REMIND_EVERY_DAYS * 864e5 - 36e5) continue
    const r = await chasePerson(e.biz, e.subject, e.id, 'reminder')
    if (r.ok) reminded++
  }
  return { reminded }
}
