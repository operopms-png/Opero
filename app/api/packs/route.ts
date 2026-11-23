import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DEFAULT_PACK, STAGES, cleanPack } from '@/lib/pack-calc'

// Staff Centre → Marketing → Pack Builder: saved investment packs, each with a stage and a private link (/p/<token>).
//   GET                       -> { packs: [{ id, name, prepared_for, stage, active, token, opens, last_opened_at, sent_at, updated_at }], isAdmin }
//   GET ?id=<id>              -> { pack: { …, data } }
//   POST {action:'create', name?, from?: <pack id>}                 -> { pack }   (from copies another pack)
//   POST {action:'update', id, name?, data?}                        -> { pack }
//   POST {action:'stage', id, stage}                                -> { pack }   (draft | sent | opened | interested | committed | funded | closed)
//   POST {action:'active', id, active}                              -> { pack }   (pause or resume the link)
//   POST {action:'delete', id}                                      admin only
// Every pack belongs to one company; nobody sees another company's packs.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const LIST = 'id,name,prepared_for,stage,active,token,opens,last_opened_at,sent_at,updated_at'
const STAGE_KEYS: string[] = STAGES.map(s => s.k)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const { data } = await db.from('invest_packs').select('*').eq('id', id).eq('business_id', c.businessId).maybeSingle()
    if (!data) return bad('Pack not found', 404)
    return NextResponse.json({ pack: { ...data, data: cleanPack(data.data) } })
  }
  const { data } = await db.from('invest_packs').select(LIST).eq('business_id', c.businessId).order('updated_at', { ascending: false }).limit(200)
  return NextResponse.json({ packs: data ?? [], isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const biz = c.businessId
  const mine = (id: any) => db.from('invest_packs').select('*').eq('id', String(id || '')).eq('business_id', biz).maybeSingle()

  if (b.action === 'create') {
    let data = DEFAULT_PACK, name = String(b.name || '').trim().slice(0, 150) || 'Untitled pack'
    if (b.from) {
      const { data: src } = await mine(b.from)
      if (!src) return bad('Pack not found', 404)
      data = cleanPack(src.data)
      if (!b.name) name = `${src.name} (copy)`.slice(0, 150)
    }
    const { data: row, error } = await db.from('invest_packs').insert({ business_id: biz, name, prepared_for: data.prepared_for || null, data, created_by: c.name || c.email }).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ pack: row })
  }

  const { data: cur } = await mine(b.id)
  if (!cur) return bad('Pack not found', 404)

  if (b.action === 'update') {
    const patch: any = { updated_at: new Date().toISOString() }
    if (b.name !== undefined) { const n = String(b.name).trim().slice(0, 150); if (!n) return bad('Give the pack a name.'); patch.name = n }
    if (b.data !== undefined) { const d = cleanPack(b.data, cleanPack(cur.data)); patch.data = d; patch.prepared_for = d.prepared_for || null }
    const { data, error } = await db.from('invest_packs').update(patch).eq('id', cur.id).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ pack: data })
  }
  if (b.action === 'stage') {
    const stage = String(b.stage || '')
    if (!STAGE_KEYS.includes(stage)) return bad('Pick a stage.')
    const patch: any = { stage, updated_at: new Date().toISOString() }
    if (stage !== 'draft' && !cur.sent_at) patch.sent_at = new Date().toISOString()
    const { data, error } = await db.from('invest_packs').update(patch).eq('id', cur.id).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ pack: data })
  }
  if (b.action === 'active') {
    const { data, error } = await db.from('invest_packs').update({ active: !!b.active, updated_at: new Date().toISOString() }).eq('id', cur.id).eq('business_id', biz).select('*').single()
    return error ? bad(error.message, 500) : NextResponse.json({ pack: data })
  }
  if (b.action === 'delete') {
    if (!c.isAdmin) return bad('Only admins can delete packs.', 403)
    await db.from('invest_packs').delete().eq('id', cur.id).eq('business_id', biz)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
