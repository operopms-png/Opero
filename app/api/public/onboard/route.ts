export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { createFromTemplate } from '@/lib/documents'
import { ensureLink, TOKEN_RE } from '@/lib/client-link'
import type { PortalSubject } from '@/lib/doc-hub'

// The page a new client opens from a "new client link" (/start/[token]).
//   GET  ?t=<token>                    → { company, kind, prefill, ask_docs, has_contract, status, expired, link_token?, doc_token? }
//   POST {t, name, email, phone, property?}   → creates (or updates) their owner / tenant record, prepares the contract, returns { link_token, doc_token }
//   POST {t, action:'finish'}          → marks it done (when there is no contract to sign)
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TABLE = { owner: { pm: 'pm_landlords', ea: 'estate_landlords' }, tenant: { pm: 'pm_tenants', ea: 'estate_tenants' } } as const
const SUBJECT = { owner: { pm: 'landlord', ea: 'ea_landlord' }, tenant: { pm: 'tenant', ea: 'ea_tenant' } } as const
const PERSON = { owner: { pm: 'pm_owner', ea: 'ea_owner' }, tenant: { pm: 'pm_tenant', ea: 'ea_tenant' } } as const

async function load(t: string) {
  if (!TOKEN_RE.test(t || '')) return null
  const { data } = await db.from('onboarding_links').select('*').eq('token', t).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const l = await load(req.nextUrl.searchParams.get('t') || '')
  if (!l) return bad('This link is not valid. Please ask us to send you a new one.', 404)
  const expired = new Date(l.expires_at).getTime() < Date.now() && l.status !== 'done'
  const { data: s } = await db.from('invoice_settings').select('company_name').eq('business_id', l.business_id).maybeSingle()
  let link_token: string | null = null, doc_token: string | null = null
  if (!expired && l.subject_id) {
    link_token = (await ensureLink(l.business_id, SUBJECT[l.kind as 'owner'][l.module as 'pm'] as PortalSubject, l.subject_id, 'new client link')).token
    if (l.doc_send_id) doc_token = (await db.from('doc_sends').select('token').eq('id', l.doc_send_id).maybeSingle()).data?.token ?? null
  }
  return NextResponse.json({ company: s?.company_name || 'NOVOURQ', kind: l.kind, subject: SUBJECT[l.kind as 'owner'][l.module as 'pm'], prefill: { name: l.name || '', email: l.email || '', property: l.property_label || '' }, ask_docs: l.ask_docs, has_contract: !!l.template_id, status: l.status, expired, link_token, doc_token })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const l = await load(String(b.t || ''))
  if (!l) return bad('This link is not valid. Please ask us to send you a new one.', 404)
  if (new Date(l.expires_at).getTime() < Date.now() && l.status !== 'done') return bad('This link has expired. Please ask us to send you a new one.', 410)
  const kind = l.kind as 'owner' | 'tenant', mod = l.module as 'pm' | 'ea'

  if (b.action === 'finish') {
    if (!l.subject_id) return bad('Please add your details first.')
    await db.from('onboarding_links').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', l.id)
    await notify(l, 'finished setting up')
    return NextResponse.json({ ok: true })
  }

  const name = String(b.name || '').trim().slice(0, 150), email = String(b.email || '').trim().toLowerCase().slice(0, 200), phone = String(b.phone || '').trim().slice(0, 40), property = String(b.property || '').trim().slice(0, 200)
  if (name.length < 2) return bad('Please enter your full name.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Please enter a valid email address.')
  if (phone.length < 5) return bad('Please enter your phone number.')

  let id: string | null = l.subject_id
  const note = property ? `Added through a new client link. Property: ${property}` : 'Added through a new client link.'
  if (id) {
    const patch: any = { name, email, phone }
    await db.from(TABLE[kind][mod]).update(patch).eq('id', id).eq('user_id', l.business_id)
  } else {
    const row: any = { user_id: l.business_id, name, email, phone, notes: note }
    if (kind === 'owner' && property) row.address = property
    const { data, error } = await db.from(TABLE[kind][mod]).insert(row).select('id').single()
    if (error || !data) return bad('Could not save your details. Please try again.', 500)
    id = data.id
  }
  const patch: any = { name, email, phone, property_label: property || l.property_label, subject_id: id, status: l.status === 'done' ? 'done' : 'started' }

  if (l.template_id && !l.doc_send_id) {
    try {
      const { data: tpl } = await db.from('doc_templates').select('*').eq('id', l.template_id).eq('business_id', l.business_id).maybeSingle()
      if (tpl) {
        const doc = await createFromTemplate(l.business_id, tpl, PERSON[kind][mod], id, { name: l.created_by || '', email: '' }, property ? { property_address: property } : {})
        const now = new Date().toISOString()
        await db.from('doc_sends').update({ status: 'sent', sent_at: now, updated_at: now, recipient_name: name, recipient_email: email, needs_signature: true }).eq('id', doc.id)
        patch.doc_send_id = doc.id
      }
    } catch { /* they can still upload documents; staff can send the contract by hand */ }
  }
  await db.from('onboarding_links').update(patch).eq('id', l.id)
  if (!l.subject_id) await notify({ ...l, name }, 'started setting up')
  const link_token = (await ensureLink(l.business_id, SUBJECT[kind][mod] as PortalSubject, id!, 'new client link')).token
  const docId = patch.doc_send_id || l.doc_send_id
  const doc_token = docId ? (await db.from('doc_sends').select('token').eq('id', docId).maybeSingle()).data?.token ?? null : null
  return NextResponse.json({ link_token, doc_token })
}

async function notify(l: any, what: string) {
  await db.from('notifications').insert({ user_id: l.business_id, title: `New ${l.kind} ${what}`, message: `${l.name || 'A new client'} ${what} through a new client link. Check Documents to review what they upload.`, type: 'document', module: 'staffcentre', link: '/staff-centre/documents' }).then(() => {}, () => {})
}
