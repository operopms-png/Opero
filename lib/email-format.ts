// Server side of the house email templates -- loads a business's saved
// templates (email_templates). Rendering helpers live in
// lib/email-format-shared.ts. One template is the default: it's pre-selected
// when staff write an email and used for AI replies and Marketing.
import { serviceClient } from '@/lib/admin-auth'
import { DEFAULT_FORMAT, FORMAT_FIELDS, type EmailFormat, type EmailTemplate } from '@/lib/email-format-shared'
export * from '@/lib/email-format-shared'

function fill(row: any): EmailTemplate {
  const f: any = { ...DEFAULT_FORMAT }
  for (const k of FORMAT_FIELDS) if (row && row[k] !== null && row[k] !== undefined) f[k] = row[k]
  return { ...f, id: row?.id ?? '', name: row?.name ?? 'Standard', is_default: !!row?.is_default }
}

export async function listTemplates(businessId: string): Promise<EmailTemplate[]> {
  const { data } = await serviceClient.from('email_templates').select('*').eq('business_id', businessId).order('is_default', { ascending: false }).order('sort').order('created_at')
  if (!data?.length) return [{ ...DEFAULT_FORMAT, id: '', name: 'Standard', is_default: true }]
  return data.map(fill)
}

// The chosen template, or the default one, or the built-in format.
export async function getFormat(businessId: string, templateId?: string | null): Promise<EmailFormat> {
  const all = await listTemplates(businessId)
  return (templateId && all.find(t => t.id === templateId)) || all.find(t => t.is_default) || all[0]
}

export async function saveTemplate(businessId: string, t: any) {
  const patch: any = { business_id: businessId, updated_at: new Date().toISOString(), name: String(t?.name || 'Untitled').slice(0, 80) }
  for (const k of FORMAT_FIELDS) if (t?.[k] !== undefined) patch[k] = typeof t[k] === 'string' ? t[k].slice(0, 2000) : !!t[k]
  const { count } = await serviceClient.from('email_templates').select('id', { count: 'exact', head: true }).eq('business_id', businessId)
  if (!count) patch.is_default = true
  const q = t?.id
    ? serviceClient.from('email_templates').update(patch).eq('id', t.id).eq('business_id', businessId).select('id').single()
    : serviceClient.from('email_templates').insert(patch).select('id').single()
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function setDefaultTemplate(businessId: string, id: string) {
  await serviceClient.from('email_templates').update({ is_default: false }).eq('business_id', businessId)
  await serviceClient.from('email_templates').update({ is_default: true }).eq('business_id', businessId).eq('id', id)
}

export async function deleteTemplate(businessId: string, id: string) {
  const all = await listTemplates(businessId)
  if (all.length <= 1) throw new Error('Keep at least one template')
  await serviceClient.from('email_templates').delete().eq('business_id', businessId).eq('id', id)
  if (all.find(t => t.id === id)?.is_default) {
    const next = all.find(t => t.id !== id)
    if (next) await setDefaultTemplate(businessId, next.id)
  }
}
