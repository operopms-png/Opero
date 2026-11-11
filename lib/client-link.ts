// Secure client links: one private link per owner or tenant that opens their Documents, contracts to sign and invoices to pay, with no login. Server-only.
import { randomBytes } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/brand'
import { DOC_SUBJECT_TABLE } from '@/lib/lease-doc-types'
import type { PortalSubject } from '@/lib/doc-hub'

export const LINK_DAYS = 14
/** person_kind used on invoices and signing documents */
export const PERSON_KIND: Record<PortalSubject, string> = { landlord: 'pm_owner', tenant: 'pm_tenant', ea_landlord: 'ea_owner', ea_tenant: 'ea_tenant', cohost: 'cohost' }
/** every person_kind an invoice or document may carry for this kind of person (invoices use 'owner' for owners) */
export const PERSON_KINDS: Record<PortalSubject, string[]> = { landlord: ['pm_owner', 'owner'], tenant: ['pm_tenant'], ea_landlord: ['ea_owner', 'owner'], ea_tenant: ['ea_tenant'], cohost: ['cohost'] }
export const TOKEN_RE = /^[0-9a-f]{48}$/
export const linkUrl = (token: string) => `${SITE_URL}/d/${token}`

/** The person's current link, or a new one valid for 14 days. A link with under 3 days left is replaced. */
export async function ensureLink(biz: string, subject: PortalSubject, id: string, by = '') {
  const { data: have } = await db.from('client_links').select('token, expires_at').eq('business_id', biz).eq('subject', subject).eq('subject_id', id).eq('revoked', false).order('expires_at', { ascending: false }).limit(1).maybeSingle()
  if (have && new Date(have.expires_at).getTime() - Date.now() > 3 * 864e5) return { token: have.token as string, expires_at: have.expires_at as string }
  const token = randomBytes(24).toString('hex'), expires_at = new Date(Date.now() + LINK_DAYS * 864e5).toISOString()
  const { error } = await db.from('client_links').insert({ token, business_id: biz, subject, subject_id: id, expires_at, created_by: by || null })
  if (error) throw new Error('Could not create the link.')
  return { token, expires_at }
}

/** Look a link up from a request. Returns null when it is unknown, revoked or expired. */
export async function resolveLink(token: string, record = false) {
  if (!TOKEN_RE.test(token || '')) return null
  const { data: link } = await db.from('client_links').select('*').eq('token', token).maybeSingle()
  if (!link || link.revoked || new Date(link.expires_at).getTime() < Date.now()) return null
  const { data: rec } = await db.from(DOC_SUBJECT_TABLE[link.subject as PortalSubject]).select('id, user_id, name, email, phone').eq('id', link.subject_id).eq('user_id', link.business_id).maybeSingle()
  if (!rec) return null
  if (record) await db.from('client_links').update({ last_opened_at: new Date().toISOString(), opens: (link.opens || 0) + 1 }).eq('id', link.id)
  return { link, rec, subject: link.subject as PortalSubject }
}
