// Data Hub for tenants and landlords (server only): everything held about ONE signed-in portal person.
// The person is found by their sign-in (portal_user_id), never by anything sent from the browser.
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { companyName } from '@/lib/ai-proposal-utils'

export async function portalIdentity(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user } } = await asUser.auth.getUser(token)
  return user ? { uid: user.id, email: (user.email ?? '').toLowerCase() } : null
}

const ids = (rows: any[] | null | undefined) => (rows ?? []).map(r => r.id as string)
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.map(k => [k, o?.[k] ?? null]))

export type MyData = { role: 'tenant' | 'landlord' | null; business: string | null; businessId: string | null; sections: { title: string; rows: { label: string; detail?: string; tag?: string; tone?: 'ok' | 'warn' | 'bad' | 'info'; href?: string }[] }[]; summary: { label: string; value: string }[]; raw: Record<string, unknown> }

const money = (n: any) => (n == null || n === '' ? '-' : '£' + Number(n).toLocaleString('en-GB'))
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

export async function loadMyData(uid: string, email: string): Promise<MyData> {
  const [pt, et, pl, el] = await Promise.all([
    db.from('pm_tenants').select('*').eq('portal_user_id', uid),
    db.from('estate_tenants').select('*').eq('portal_user_id', uid),
    db.from('pm_landlords').select('*').eq('portal_user_id', uid),
    db.from('estate_landlords').select('*').eq('portal_user_id', uid),
  ])
  const tenantRows = [...(pt.data ?? []), ...(et.data ?? [])]
  const landlordRows = [...(pl.data ?? []), ...(el.data ?? [])]
  const role = tenantRows.length ? 'tenant' : landlordRows.length ? 'landlord' : null
  const first: any = tenantRows[0] ?? landlordRows[0]
  if (!role || !first) return { role: null, business: null, businessId: null, sections: [], summary: [], raw: {} }
  const businessId = first.user_id as string
  const business = (await companyName(businessId).catch(() => '')) || 'your property manager'

  const profileRows = (rows: any[]) => rows.flatMap(r => [
    { label: 'Name', detail: r.name },
    { label: 'Email', detail: r.email || 'Not on file', tag: r.email ? undefined : 'Missing', tone: 'warn' as const },
    { label: 'Phone', detail: r.phone || 'Not on file' },
    ...(r.emergency_contact_name ? [{ label: 'Emergency contact', detail: `${r.emergency_contact_name} ${r.emergency_contact_phone || ''}`.trim() }] : []),
    { label: 'ID document', detail: r.id_url ? 'Held on file' : 'None held' },
  ]).slice(0, 8)

  if (role === 'tenant') {
    const pmIds = ids(pt.data), esIds = ids(et.data)
    const [leases, tenancies, pay, docs, edocs, maint] = await Promise.all([
      pmIds.length ? db.from('pm_leases').select('property_id,start_date,end_date,monthly_rent,deposit,status,deposit_scheme,deposit_protected_date').in('tenant_id', pmIds) : { data: [] as any[] },
      esIds.length ? db.from('estate_tenancies').select('property_id,start_date,end_date,rent,deposit,status').in('tenant_id', esIds) : { data: [] as any[] },
      pmIds.length ? db.from('pm_rent_payments').select('amount,due_date,paid_date,status,category').in('tenant_id', pmIds).order('due_date', { ascending: false }).limit(24) : { data: [] as any[] },
      pmIds.length ? db.from('pm_documents').select('name,category,type,file_url,url').in('tenant_id', pmIds).eq('visible_to_tenant', true).limit(40) : { data: [] as any[] },
      esIds.length ? db.from('estate_documents').select('name,category,file_url').in('tenant_id', esIds).eq('visible_to_tenant', true).limit(40) : { data: [] as any[] },
      pmIds.length ? db.from('pm_maintenance').select('title,status,created_at').in('tenant_id', pmIds).order('created_at', { ascending: false }).limit(20) : { data: [] as any[] },
    ])
    const propIds = [...new Set([...(leases.data ?? []), ...(tenancies.data ?? [])].map((r: any) => r.property_id).filter(Boolean))]
    const [pp, ep] = propIds.length ? await Promise.all([db.from('pm_properties').select('id,name').in('id', propIds), db.from('estate_properties').select('id,name').in('id', propIds)]) : [{ data: [] as any[] }, { data: [] as any[] }]
    const pname: Record<string, string> = Object.fromEntries([...(pp.data ?? []), ...(ep.data ?? [])].map((p: any) => [p.id, p.name]))
    const tenancyRows = [
      ...(leases.data ?? []).map((l: any) => ({ label: pname[l.property_id] || 'My home', detail: `${day(l.start_date)} to ${day(l.end_date)} · rent ${money(l.monthly_rent)} · deposit ${money(l.deposit)}${l.deposit_scheme ? ' · protected with ' + l.deposit_scheme : ''}`, tag: l.status || undefined, tone: 'info' as const })),
      ...(tenancies.data ?? []).map((l: any) => ({ label: pname[l.property_id] || 'My home', detail: `${day(l.start_date)} to ${day(l.end_date)} · rent ${money(l.rent)} · deposit ${money(l.deposit)}`, tag: l.status || undefined, tone: 'info' as const })),
    ]
    const payRows = (pay.data ?? []).map((p: any) => ({ label: `${p.category || 'Rent'} due ${day(p.due_date)}`, detail: p.paid_date ? `Paid ${day(p.paid_date)}` : 'Not paid yet', tag: money(p.amount), tone: (p.paid_date ? 'ok' : String(p.status).toLowerCase().includes('overdue') ? 'bad' : 'warn') as 'ok' | 'warn' | 'bad' }))
    const docRows = [...(docs.data ?? []), ...(edocs.data ?? [])].map((d: any) => ({ label: d.name, detail: d.category || d.type || '', href: d.file_url || d.url || undefined, tag: (d.file_url || d.url) ? 'Open' : undefined, tone: 'info' as const }))
    const mRows = (maint.data ?? []).map((m: any) => ({ label: m.title, detail: day(m.created_at), tag: m.status || undefined, tone: (/complet|closed|done/i.test(m.status || '') ? 'ok' : 'warn') as 'ok' | 'warn' }))
    const paidOn = (pay.data ?? []).filter((p: any) => p.paid_date).length
    return {
      role, business, businessId,
      summary: [{ label: 'Tenancies', value: String(tenancyRows.length) }, { label: 'Payments on record', value: String((pay.data ?? []).length) }, { label: 'Paid', value: String(paidOn) }, { label: 'Documents shared with me', value: String(docRows.length) }],
      sections: [
        { title: 'My tenancy', rows: tenancyRows },
        { title: 'My payments', rows: payRows },
        { title: 'My documents', rows: docRows },
        { title: 'My repair requests', rows: mRows },
        { title: 'My information', rows: profileRows(tenantRows) },
      ],
      raw: { tenant_records: tenantRows.map(r => pick(r, ['name', 'email', 'phone', 'emergency_contact_name', 'emergency_contact_phone', 'notify_email', 'notify_sms', 'created_at'])), tenancies: [...(leases.data ?? []), ...(tenancies.data ?? [])], payments: pay.data ?? [], documents: [...(docs.data ?? []), ...(edocs.data ?? [])], repair_requests: maint.data ?? [] },
    }
  }

  const pmL = ids(pl.data), esL = ids(el.data)
  const [pprops, eprops, stm, plp, elp, edocs] = await Promise.all([
    pmL.length ? db.from('pm_properties').select('id,name,address,status').in('owner_id', pmL) : { data: [] as any[] },
    esL.length ? db.from('estate_properties').select('id,name,address,status').in('owner_id', esL) : { data: [] as any[] },
    db.from('landlord_statements').select('period_label,balance,sent_at').in('landlord_id', [...pmL, ...esL]).not('sent_at', 'is', null).order('sent_at', { ascending: false }).limit(24),
    pmL.length ? db.from('pm_landlord_payments').select('category,amount,due_date,paid_date').in('landlord_id', pmL).order('due_date', { ascending: false }).limit(24) : { data: [] as any[] },
    esL.length ? db.from('estate_landlord_payments').select('category,amount,due_date,paid_date').in('landlord_id', esL).order('due_date', { ascending: false }).limit(24) : { data: [] as any[] },
    esL.length ? db.from('estate_documents').select('name,category,file_url').in('landlord_id', esL).limit(40) : { data: [] as any[] },
  ])
  const props = [...(pprops.data ?? []), ...(eprops.data ?? [])]
  const pIds = props.map((p: any) => p.id)
  const [pc, ec] = pIds.length ? await Promise.all([db.from('pm_compliance').select('property_id,type,expiry_date').in('property_id', pIds), db.from('estate_compliance').select('property_id,type,expiry_date').in('property_id', pIds)]) : [{ data: [] as any[] }, { data: [] as any[] }]
  const pn: Record<string, string> = Object.fromEntries(props.map((p: any) => [p.id, p.name]))
  const now = Date.now()
  const comp = [...(pc.data ?? []), ...(ec.data ?? [])].sort((a: any, b: any) => String(a.expiry_date).localeCompare(String(b.expiry_date)))
  const compRows = comp.map((c: any) => {
    const left = c.expiry_date ? Math.round((new Date(c.expiry_date).getTime() - now) / 86400000) : null
    return { label: `${c.type} · ${pn[c.property_id] || ''}`, detail: c.expiry_date ? `Expires ${day(c.expiry_date)}` : 'No expiry date', tag: left == null ? undefined : left < 0 ? 'Expired' : left <= 30 ? 'Expires soon' : 'Current', tone: (left == null ? 'info' : left < 0 ? 'bad' : left <= 30 ? 'warn' : 'ok') as 'ok' | 'warn' | 'bad' | 'info' }
  })
  const payRows = [...(plp.data ?? []), ...(elp.data ?? [])].map((p: any) => ({ label: `${p.category || 'Payment'} due ${day(p.due_date)}`, detail: p.paid_date ? `Paid ${day(p.paid_date)}` : 'Not paid yet', tag: money(p.amount), tone: (p.paid_date ? 'ok' : 'warn') as 'ok' | 'warn' }))
  const { data: lastDl } = await db.from('data_requests').select('created_at').eq('subject', 'landlord').eq('kind', 'export').eq('subject_email', email).order('created_at', { ascending: false }).limit(1)
  return {
    role, business, businessId,
    summary: [{ label: 'Properties', value: String(props.length) }, { label: 'Statements', value: String((stm.data ?? []).length) }, { label: 'Certificates', value: String(compRows.length) }, { label: 'Payments on record', value: String(payRows.length) }],
    sections: [
      { title: 'My properties', rows: props.map((p: any) => ({ label: p.name, detail: p.address || '', tag: p.status || undefined, tone: 'info' as const })) },
      { title: 'Certificates for my properties', rows: compRows },
      { title: 'Statements', rows: (stm.data ?? []).map((s: any) => ({ label: s.period_label || 'Statement', detail: `Sent ${day(s.sent_at)}`, tag: money(s.balance), tone: 'info' as const })) },
      { title: 'Payments', rows: payRows },
      { title: 'Documents', rows: (edocs.data ?? []).map((d: any) => ({ label: d.name, detail: d.category || '', href: d.file_url || undefined, tag: d.file_url ? 'Open' : undefined, tone: 'info' as const })) },
      { title: 'My information', rows: profileRows(landlordRows) },
      { title: 'Who can see my data', rows: [{ label: business, detail: 'Your property manager and their staff', tone: 'info' as const }, { label: 'Contractors', detail: 'Only the address and job details for a repair', tone: 'info' as const }, { label: 'My last download', detail: lastDl?.[0] ? day(lastDl[0].created_at as string) : 'None yet', tone: 'info' as const }] },
    ],
    raw: { landlord_records: landlordRows.map(r => pick(r, ['name', 'email', 'phone', 'address', 'created_at'])), properties: props, certificates: comp, statements: stm.data ?? [], payments: [...(plp.data ?? []), ...(elp.data ?? [])], documents: edocs.data ?? [] },
  }
}
