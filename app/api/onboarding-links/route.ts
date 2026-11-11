export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { SITE_URL } from '@/lib/brand'

// New client links (staff only): a private page for someone who is not in the system yet. They enter their details, upload documents and sign;
// their owner or tenant record is created for them. 
//   GET  → { links: recent links with their status, url }
//   POST {kind:'owner'|'tenant', module:'pm'|'ea', template_id?, name?, email?, property_label?, ask_docs?} → { url, whatsapp }
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (_c: any) => true // any staff member can send a client link
const DAYS = 14

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const { data } = await db.from('onboarding_links').select('id, token, kind, module, name, email, property_label, status, expires_at, created_at, completed_at').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(20)
  return NextResponse.json({ links: (data ?? []).map((l: any) => ({ ...l, url: `${SITE_URL}/start/${l.token}`, expired: new Date(l.expires_at).getTime() < Date.now() && l.status !== 'done' })) })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const b = await req.json().catch(() => ({}))
  if (b.kind === 'cohost') b.module = 'str'
  if (!['owner', 'tenant', 'cohost'].includes(b.kind) || !['pm', 'ea', 'str'].includes(b.module)) return bad('Choose owner, tenant or co-host, and Property Management or Estate Agency.')
  let template_id: string | null = null
  if (b.template_id) {
    const { data: t } = await db.from('doc_templates').select('id, needs_signature').eq('id', String(b.template_id)).eq('business_id', c.businessId).maybeSingle()
    if (!t) return bad('Choose a template from the list.'); template_id = t.id
  }
  const email = String(b.email || '').trim().slice(0, 200)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('That email address does not look right.')
  const token = randomBytes(24).toString('hex'), expires_at = new Date(Date.now() + DAYS * 864e5).toISOString()
  const { error } = await db.from('onboarding_links').insert({ token, business_id: c.businessId, kind: b.kind, module: b.module, template_id, name: String(b.name || '').trim().slice(0, 150) || null, email: email || null, property_label: String(b.property_label || '').trim().slice(0, 200) || null, ask_docs: b.ask_docs !== false, expires_at, created_by: c.email || c.name || '' })
  if (error) return bad('Could not create the link.', 500)
  const url = `${SITE_URL}/start/${token}`, first = String(b.name || '').trim().split(/\s+/)[0] || 'there'
  return NextResponse.json({ url, whatsapp: `Hi ${first}, to get you set up please open this private link, add your details${b.ask_docs !== false ? ', upload your documents' : ''}${template_id ? ' and sign your agreement' : ''}: ${url} (valid ${DAYS} days).` })
}
