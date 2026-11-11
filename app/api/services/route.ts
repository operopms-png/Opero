import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DOC_SUBJECT_TABLE, isSubject } from '@/lib/lease-doc-types'

// Staff Centre → Marketing → Services Pack: the documents a company sends to show its services,
// and the share links that open them. Links stay live until paused or deleted.
//   GET                                   -> { docs, links, submissions, isAdmin }   (links carry opens, last opened and views per document)
//   POST {action:'doc-add', title, description, url}
//   POST {action:'doc-update', id, title?, description?, url?, active?}
//   POST {action:'doc-delete', id}         admin only
//   POST {action:'link-create', name, doc_ids[], subject?, subject_id?}     -> { link }   (subject: landlord | ea_landlord | cohost files submissions on their record)
//   POST {action:'link-update', id, name?, doc_ids?, active?}
//   POST {action:'link-delete', id}
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const biz = c.businessId
  const [{ data: docs }, { data: links }] = await Promise.all([
    db.from('service_docs').select('*').eq('business_id', biz).order('sort').order('created_at'),
    db.from('service_links').select('*').eq('business_id', biz).order('created_at', { ascending: false }).limit(200),
  ])
  const ids = (links ?? []).map((l: any) => l.id)
  const { data: views } = ids.length ? await db.from('service_views').select('link_id,doc_id').in('link_id', ids).not('doc_id', 'is', null).limit(20000) : { data: [] as any[] }
  const per: Record<string, Record<string, number>> = {}
  for (const v of views ?? []) { per[v.link_id] = per[v.link_id] || {}; per[v.link_id][v.doc_id] = (per[v.link_id][v.doc_id] || 0) + 1 }
  const { data: subs } = await db.from('service_submissions').select('id,link_id,doc_title,submitter_name,submitter_email,path,created_at,lease_doc_id').eq('business_id', biz).order('created_at', { ascending: false }).limit(100)
  const submissions = await Promise.all((subs ?? []).map(async (s: any) => {
    const { data: u } = await db.storage.from('service-submissions').createSignedUrl(s.path, 3600)
    const { path, ...rest } = s
    return { ...rest, url: u?.signedUrl || null, link_name: (links ?? []).find((l: any) => l.id === s.link_id)?.name || '', filed_for: s.lease_doc_id ? (links ?? []).find((l: any) => l.id === s.link_id)?.subject_name || null : null }
  }))
  return NextResponse.json({ docs: docs ?? [], submissions, links: (links ?? []).map((l: any) => ({ ...l, doc_views: per[l.id] || {} })), isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const biz = c.businessId, by = c.name || c.email

  if (b.action === 'doc-add') {
    const title = String(b.title || '').trim().slice(0, 150), url = String(b.url || '')
    if (!title) return bad('Give the document a name.')
    if (!/^https:\/\//.test(url)) return bad('Upload failed — try again.')
    const { count } = await db.from('service_docs').select('id', { count: 'exact', head: true }).eq('business_id', biz)
    const { data, error } = await db.from('service_docs').insert({ business_id: biz, title, description: String(b.description || '').trim().slice(0, 400) || null, url, sort: (count || 0) + 1 }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ doc: data })
  }
  if (b.action === 'doc-update') {
    const patch: any = {}
    if (b.title !== undefined) { const t = String(b.title).trim().slice(0, 150); if (!t) return bad('Give the document a name.'); patch.title = t }
    if (b.description !== undefined) patch.description = String(b.description || '').trim().slice(0, 400) || null
    if (b.active !== undefined) patch.active = !!b.active
    if (b.fillable !== undefined) patch.fillable = !!b.fillable
    if (b.url) { if (!/^https:\/\//.test(String(b.url))) return bad('Upload failed — try again.'); patch.url = String(b.url) }
    const { data, error } = await db.from('service_docs').update(patch).eq('id', String(b.id || '')).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ doc: data })
  }
  if (b.action === 'doc-delete') {
    if (!c.isAdmin) return bad('Only admins can delete documents.', 403)
    await db.from('service_docs').delete().eq('id', String(b.id || '')).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  const mine = async (ids: any) => {
    const want = (Array.isArray(ids) ? ids : []).map(String)
    if (!want.length) return null
    const { data } = await db.from('service_docs').select('id').eq('business_id', biz).in('id', want)
    const ok = new Set((data ?? []).map((d: any) => d.id))
    return want.filter(i => ok.has(i))
  }
  if (b.action === 'link-create') {
    const ids = await mine(b.doc_ids)
    if (!ids?.length) return bad('Tick at least one document.')
    const name = String(b.name || '').trim().slice(0, 150) || (ids.length > 1 ? 'Our services' : 'Document link')
    // Optional: tie the link to one landlord or co-host so their submissions file onto their record.
    let subj: any = {}
    if (b.subject_id) {
      const sj = String(b.subject || '')
      if (!isSubject(sj) || !['landlord', 'ea_landlord', 'cohost'].includes(sj)) return bad('Pick a landlord or co-host.')
      const { data: who } = await db.from(DOC_SUBJECT_TABLE[sj]).select('id,name').eq('id', String(b.subject_id)).eq('user_id', biz).maybeSingle()
      if (!who) return bad('That person was not found.')
      subj = { subject: sj, subject_id: who.id, subject_name: who.name }
    }
    const { data, error } = await db.from('service_links').insert({ business_id: biz, token: randomBytes(12).toString('hex'), name, doc_ids: ids, created_by: by, ...subj }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ link: data })
  }
  if (b.action === 'link-update') {
    const patch: any = {}
    if (b.name !== undefined) patch.name = String(b.name).trim().slice(0, 150) || 'Our services'
    if (b.active !== undefined) patch.active = !!b.active
    if (b.doc_ids !== undefined) { const ids = await mine(b.doc_ids); if (!ids?.length) return bad('Tick at least one document.'); patch.doc_ids = ids }
    const { data, error } = await db.from('service_links').update(patch).eq('id', String(b.id || '')).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ link: data })
  }
  if (b.action === 'link-delete') {
    await db.from('service_links').delete().eq('id', String(b.id || '')).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
