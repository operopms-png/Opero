import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { docSettings } from '@/lib/documents'

// The page a recipient opens from a services link (/s/[token]). No login.
//   GET ?t=<token>            -> { name, company, logo, docs:[{id,title,description,url,fillable}] }   records an open
//   POST { t, doc }           records that this document was viewed
// A paused or deleted link answers "not found".
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
async function load(t: string) {
  if (!/^[0-9a-f]{16,64}$/.test(t)) return null
  const { data } = await db.from('service_links').select('*').eq('token', t).eq('active', true).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const l = await load(req.nextUrl.searchParams.get('t') || '')
  if (!l) return bad('This link is no longer available.', 404)
  const [s, { data: docs }] = await Promise.all([docSettings(l.business_id), db.from('service_docs').select('id,title,description,url,sort,fillable').eq('business_id', l.business_id).eq('active', true).in('id', l.doc_ids).order('sort')])
  await db.from('service_links').update({ opens: (l.opens || 0) + 1, last_opened_at: new Date().toISOString() }).eq('id', l.id)
  await db.from('service_views').insert({ link_id: l.id })
  return NextResponse.json({ name: l.name, property: l.property_label || null, company: s.company_name, logo: s.logo_url, docs: (docs ?? []).map(({ sort, ...d }: any) => d) })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const l = await load(String(b.t || ''))
  if (!l) return bad('This link is no longer available.', 404)
  const doc = String(b.doc || '')
  if (l.doc_ids.includes(doc)) await db.from('service_views').insert({ link_id: l.id, doc_id: doc })
  return NextResponse.json({ ok: true })
}
