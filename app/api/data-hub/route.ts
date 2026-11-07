import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Data Hub for the business (account admins): counts, data health, where records came from, recent AI changes and data requests.
export const maxDuration = 30

const count = async (table: string, biz: string) => (await db.from(table).select('id', { count: 'exact', head: true }).eq('user_id', biz)).count ?? 0
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can open the Data Hub.' }, { status: 403 })
  const biz = c.businessId
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const [pProps, eProps, pTen, eTen, pLand, eLand, pDocs, eDocs, cDocs, contacts, tenRows, landRows, propRows, pComp, eComp, src, log, reqs, imports] = await Promise.all([
    count('pm_properties', biz), count('estate_properties', biz), count('pm_tenants', biz), count('estate_tenants', biz), count('pm_landlords', biz), count('estate_landlords', biz),
    count('pm_documents', biz), count('estate_documents', biz), count('company_documents', biz), count('crm_contacts', biz),
    Promise.all([db.from('pm_tenants').select('id,name,email').eq('user_id', biz).limit(2000), db.from('estate_tenants').select('id,name,email').eq('user_id', biz).limit(2000)]),
    Promise.all([db.from('pm_landlords').select('id,name,email').eq('user_id', biz).limit(2000), db.from('estate_landlords').select('id,name,email').eq('user_id', biz).limit(2000)]),
    Promise.all([db.from('pm_properties').select('id,name,address').eq('user_id', biz).is('ended_at', null).limit(2000), db.from('estate_properties').select('id,name,address').eq('user_id', biz).is('ended_at', null).limit(2000)]),
    db.from('pm_compliance').select('type,expiry_date,property_id').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', soon).order('expiry_date').limit(30),
    db.from('estate_compliance').select('type,expiry_date,property_id').eq('user_id', biz).not('expiry_date', 'is', null).lte('expiry_date', soon).order('expiry_date').limit(30),
    db.from('crm_contacts').select('source').eq('user_id', biz).limit(3000),
    db.from('ai_activity_log').select('agent_key,action,property_name,created_at,authorised_by').eq('user_id', biz).order('created_at', { ascending: false }).limit(14),
    db.from('data_requests').select('id,kind,status,subject,subject_email,requester_email,note,created_at').eq('business_id', biz).order('created_at', { ascending: false }).limit(15),
    db.from('ai_pending_actions').select('id', { count: 'exact', head: true }).eq('user_id', biz).eq('action_type', 'import_records').eq('status', 'executed'),
  ])
  const tenants = [...(tenRows[0].data ?? []), ...(tenRows[1].data ?? [])]
  const landlords = [...(landRows[0].data ?? []), ...(landRows[1].data ?? [])]
  const props = [...(propRows[0].data ?? []), ...(propRows[1].data ?? [])]
  const noEmailTenants = tenants.filter(t => !String(t.email || '').trim())
  const noEmailLandlords = landlords.filter(t => !String(t.email || '').trim())
  const seen = new Map<string, string[]>()
  for (const l of landlords) { const k = String(l.email || l.name || '').trim().toLowerCase(); if (k) seen.set(k, [...(seen.get(k) ?? []), l.name as string]) }
  const dupes = [...seen.values()].filter(v => v.length > 1)
  const noAddress = props.filter(p => !String(p.address || '').trim())
  const pn: Record<string, string> = Object.fromEntries(props.map(p => [p.id, p.name]))
  const certs = [...(pComp.data ?? []), ...(eComp.data ?? [])].sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date))).slice(0, 8)
  const today = new Date().toISOString().slice(0, 10)

  const total = tenants.length + landlords.length + props.length
  const bad = noEmailTenants.length + noEmailLandlords.length + dupes.reduce((n, v) => n + v.length - 1, 0) + noAddress.length
  const score = total ? Math.max(0, Math.round(((total - bad) / total) * 100)) : 100

  const sources: Record<string, number> = {}
  for (const r of src.data ?? []) { const k = String(r.source || 'Entered by staff').trim() || 'Entered by staff'; sources[k] = (sources[k] ?? 0) + 1 }
  const aiCount = (log.data ?? []).length

  const health = [
    { text: `${noEmailTenants.length} tenant${noEmailTenants.length === 1 ? '' : 's'} with no email`, detail: noEmailTenants.length ? 'Rent reminders cannot be emailed to them' : 'All tenants can be emailed', tone: noEmailTenants.length ? 'warn' : 'ok', names: noEmailTenants.slice(0, 5).map(t => t.name) },
    { text: `${noEmailLandlords.length} landlord${noEmailLandlords.length === 1 ? '' : 's'} with no email`, detail: noEmailLandlords.length ? 'Statements cannot be emailed to them' : 'All landlords can be emailed', tone: noEmailLandlords.length ? 'warn' : 'ok', names: noEmailLandlords.slice(0, 5).map(t => t.name) },
    { text: `${dupes.length} possible duplicate landlord${dupes.length === 1 ? '' : 's'}`, detail: dupes.length ? dupes.slice(0, 3).map(v => v.join(' / ')).join('; ') : 'No duplicates found', tone: dupes.length ? 'warn' : 'ok', names: [] },
    { text: `${noAddress.length} propert${noAddress.length === 1 ? 'y' : 'ies'} with no address`, detail: noAddress.length ? noAddress.slice(0, 4).map(p => p.name).join(', ') : 'All properties have an address', tone: noAddress.length ? 'warn' : 'ok', names: [] },
    { text: `${certs.length} certificate${certs.length === 1 ? '' : 's'} expired or expiring in 30 days`, detail: certs.length ? certs.slice(0, 4).map(x => `${x.type} ${pn[x.property_id] ? '(' + pn[x.property_id] + ')' : ''} ${day(x.expiry_date as string)}`).join('; ') : 'Nothing expiring soon', tone: certs.some(x => String(x.expiry_date) < today) ? 'bad' : certs.length ? 'warn' : 'ok', names: [] },
  ]
  return NextResponse.json({
    counts: { properties: pProps + eProps, tenants: pTen + eTen, landlords: pLand + eLand, documents: pDocs + eDocs + cDocs, contacts },
    score, health,
    sources: [
      ...Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ label: `Contacts: ${k}`, value: `${v} records` })),
      { label: 'Spreadsheet imports approved', value: String(imports.count ?? 0) },
      { label: 'Recent actions by Novourq Cloud AI', value: String(aiCount) },
    ],
    changes: (log.data ?? []).map(r => ({ action: r.action, who: r.authorised_by, when: r.created_at, property: r.property_name })),
    requests: (reqs.data ?? []).map(r => ({ id: r.id, kind: r.kind, status: r.status, subject: r.subject, who: r.subject_email || r.requester_email, note: r.note, created_at: r.created_at })),
  })
}

// POST { id, status: 'completed' | 'declined' } -> record that a person has dealt with a data request.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.isAdmin) return NextResponse.json({ error: 'Only an account admin can do this.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!['completed', 'declined'].includes(b.status)) return NextResponse.json({ error: 'Bad status' }, { status: 400 })
  await db.from('data_requests').update({ status: b.status, completed_at: new Date().toISOString() }).eq('id', String(b.id)).eq('business_id', c.businessId)
  return NextResponse.json({ ok: true })
}
