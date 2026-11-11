// Tenant onboarding pack: every document a new tenant gets, in one tab. Server-only.
import { serviceClient as db } from '@/lib/admin-auth'
import { createFromTemplate } from '@/lib/documents'
import { PACK_TEMPLATES } from '@/lib/tenancy-pack-templates'

export type PackItem = { key: string; title: string; note: string; kind: 'file' | 'doc'; file?: string; template?: string /** PACK_TEMPLATES key */; templateName?: string; action?: 'sign' | 'view' }
// Order the tenant sees. Inventory list is left out for now.
export const PACK: PackItem[] = [
  { key: 'info_sheet', title: 'Client information sheet', note: 'Your details and tenancy requirements. Fill it in and sign.', kind: 'doc', template: 'info_sheet', action: 'sign' },
  { key: 'lease', title: 'Lease agreement and security deposit scheme', note: 'Read, initial and sign your tenancy agreement, which includes how your deposit is protected.', kind: 'doc', template: 'lease', action: 'sign' },
  { key: 'deposit_guide', title: 'Your security deposit', note: 'How your deposit is held and returned.', kind: 'file', file: '/tenancy-pack/tenant-deposit-guide.pdf' },
  { key: 'how_to_rent', title: 'How to rent in Jamaica', note: 'A guide to your rights and responsibilities as a tenant.', kind: 'file', file: '/tenancy-pack/how-to-rent-in-jamaica.pdf' },
  { key: 'payment', title: 'Payment instructions', note: 'Where to send rent and your deposit.', kind: 'doc', template: 'payment', action: 'view' },
  { key: 'guide', title: 'Tenant portal guide', note: 'How to use your portal to pay, report issues and contact us.', kind: 'file', file: '/tenancy-pack/tenant-portal-guide.pdf' },
  { key: 'welcome', title: 'Welcome letter', note: 'Your property manager and who to contact.', kind: 'doc', templateName: 'Welcome Letter — New Home', action: 'view' },
]
export const TENANT_KINDS = ['pm_tenant', 'ea_tenant']

/** Make sure the three pack templates exist for this company (created once, then staff own and edit them). */
export async function ensureTemplates(biz: string) {
  const { data: have } = await db.from('doc_templates').select('id,name,active').eq('business_id', biz)
  const byName = new Map((have ?? []).map((t: any) => [t.name, t]))
  for (const t of Object.values(PACK_TEMPLATES)) {
    if (byName.has(t.name)) continue
    await db.from('doc_templates').insert({ business_id: biz, name: t.name, category: t.category, audience: 'tenant', body: t.body, lock_mode: t.lock_mode, needs_signature: t.needs_signature, active: true, created_by: 'system' })
  }
  const { data: all } = await db.from('doc_templates').select('*').eq('business_id', biz)
  return new Map((all ?? []).map((t: any) => [t.name, t]))
}
const tplFor = (it: PackItem, m: Map<string, any>) => m.get(it.template ? PACK_TEMPLATES[it.template].name : it.templateName!)

/** The pack for one tenant: files, and for each document whether it has been sent / signed. */
export async function packFor(biz: string, kind: string, id: string) {
  const tpls = await ensureTemplates(biz)
  const { data: sends } = await db.from('doc_sends').select('id,template_id,status,token,signed_at,sent_at,needs_signature').eq('business_id', biz).eq('person_kind', kind).eq('person_id', id).neq('status', 'void').order('created_at', { ascending: false })
  return PACK.map(it => {
    if (it.kind === 'file') return { key: it.key, title: it.title, note: it.note, type: 'file', url: it.file, state: 'ready' }
    const t = tplFor(it, tpls); const s = t ? (sends ?? []).find((x: any) => x.template_id === t.id && ['sent', 'opened', 'signed'].includes(x.status)) : null
    const draft = t ? (sends ?? []).find((x: any) => x.template_id === t.id) : null
    return { key: it.key, title: it.title, note: it.note, type: 'doc', template_id: t?.id ?? null, action: it.action, state: s ? (s.status === 'signed' ? 'signed' : it.action === 'sign' ? 'to_sign' : 'ready') : draft ? 'preparing' : 'not_sent', token: s?.token ?? null, signed_at: s?.signed_at ?? null }
  })
}

/** Create and send every document in the pack that this tenant has not been given yet. */
export async function sendPack(biz: string, kind: string, id: string, by: { name?: string; email?: string }) {
  const tpls = await ensureTemplates(biz)
  const { data: sends } = await db.from('doc_sends').select('template_id,status').eq('business_id', biz).eq('person_kind', kind).eq('person_id', id).neq('status', 'void')
  let made = 0
  for (const it of PACK.filter(p => p.kind === 'doc')) {
    const t = tplFor(it, tpls); if (!t || !t.active) continue
    if ((sends ?? []).some((x: any) => x.template_id === t.id)) continue
    const doc = await createFromTemplate(biz, t, kind, id, by)
    const now = new Date().toISOString()
    await db.from('doc_sends').update({ status: 'sent', sent_at: now, updated_at: now, needs_signature: t.needs_signature }).eq('id', doc.id)
    made++
  }
  return made
}
