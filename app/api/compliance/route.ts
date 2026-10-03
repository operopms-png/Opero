import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Operations → Compliance: every certificate, licence and insurance across
// Vacation Rentals, Property Management, Estate Agency and Developments in one
// list (each business keeps its own table; this reads and writes all four).
//   GET  -> { items: [{id, module, type, reference, issued, expiry, property_id, property, document_url, notes, status, days}], properties }
//   POST {action:'create', module, property_id?, type, reference?, issued?, expiry?, notes?, document_url?}
//   POST {action:'update', module, id, …same fields}
//   POST {action:'delete', module, id}

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const TABLE: Record<string, string> = { vr: 'str_compliance', pm: 'pm_compliance', ea: 'estate_compliance', dev: 'dev_compliance' }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date())
const date = (v: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null
const q = (p: PromiseLike<{ data: any }>) => Promise.resolve(p).then(r => r.data ?? []).catch(() => [])

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const biz = c.businessId
  const [vr, pm, ea, dev, vrP, pmP, eaP, devP] = await Promise.all([
    q(db.from('str_compliance').select('*').eq('user_id', biz)), q(db.from('pm_compliance').select('*').eq('user_id', biz)),
    q(db.from('estate_compliance').select('*').eq('user_id', biz)), q(db.from('dev_compliance').select('*').eq('user_id', biz)),
    q(db.from('properties').select('id,name').eq('user_id', biz)), q(db.from('pm_properties').select('id,name').eq('user_id', biz)),
    q(db.from('estate_properties').select('id,name,address').eq('user_id', biz)), q(db.from('dev_projects').select('id,name').eq('user_id', biz)),
  ])
  const props: Record<string, { id: string; name: string }[]> = {
    vr: vrP.map((p: any) => ({ id: p.id, name: p.name })), pm: pmP.map((p: any) => ({ id: p.id, name: p.name })),
    ea: eaP.map((p: any) => ({ id: p.id, name: p.name || p.address })), dev: devP.map((p: any) => ({ id: p.id, name: p.name })),
  }
  const T = today()
  const norm = (module: string, r: any) => {
    const expiry = r.expiry_date || null, pid = module === 'dev' ? r.project_id : r.property_id
    const days = expiry ? Math.round((new Date(expiry).getTime() - new Date(T).getTime()) / 864e5) : null
    return {
      id: r.id, module, type: r.type || 'Certificate', reference: r.reference ?? r.reference_number ?? null, issued: r.issued_date ?? r.issue_date ?? null, expiry,
      property_id: pid || null, property: pid ? props[module].find(p => p.id === pid)?.name || null : (r.scope === 'business' ? 'Company-wide' : null),
      document_url: r.document_url || null, notes: r.notes || null, days,
      status: days === null ? 'no-date' : days < 0 ? 'expired' : days <= 30 ? 'due' : days <= 90 ? 'soon' : 'ok',
    }
  }
  const items = [...vr.map((r: any) => norm('vr', r)), ...pm.map((r: any) => norm('pm', r)), ...ea.map((r: any) => norm('ea', r)), ...dev.map((r: any) => norm('dev', r))]
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
  return NextResponse.json({ items, properties: props, today: T })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const module = String(b.module || ''), table = TABLE[module]
  if (!table) return bad('Choose which business it belongs to.')
  const fields = () => {
    const f: any = { type: String(b.type || '').trim().slice(0, 120) || 'Certificate', expiry_date: date(b.expiry), notes: String(b.notes || '').slice(0, 2000) || null }
    if (module === 'dev') { f.project_id = b.property_id || null; f.reference_number = b.reference || null; f.issue_date = date(b.issued); f.document_url = b.document_url || null; f.status = 'active' }
    else { f.property_id = b.property_id || null; f.reference = b.reference || null; f.issued_date = date(b.issued); if (module !== 'ea') f.scope = b.property_id ? 'property' : 'business' }
    return f
  }
  if (b.action === 'create') {
    const { data, error } = await db.from(table).insert({ ...fields(), user_id: c.businessId }).select('id').single()
    return error ? bad(error.message, 500) : NextResponse.json({ id: data.id })
  }
  if (b.action === 'update') {
    const { error } = await db.from(table).update(fields()).eq('id', String(b.id || '')).eq('user_id', c.businessId)
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
  }
  if (b.action === 'delete') {
    const { error } = await db.from(table).delete().eq('id', String(b.id || '')).eq('user_id', c.businessId)
    return error ? bad(error.message, 500) : NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
