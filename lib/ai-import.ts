// Onboarding import. A new customer pastes a spreadsheet (CSV) of landlords, properties and tenants. The AI
// only maps the columns into the platform's fields. It never fills a gap. The mapped records wait in
// AI Approvals as one item, and nothing is written to the account until a person approves it.
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { svc } from './ai-proposal-utils'

export type ImportProperty = { name: string; address?: string; city?: string; country?: string; bedrooms?: number | null; bathrooms?: number | null; monthly_rent?: number | null; landlord_name?: string; landlord_email?: string; landlord_phone?: string }
export type ImportTenant = { name: string; email?: string; phone?: string; property_name?: string }

const txt = (v: any, n = 200) => (v == null ? undefined : String(v).trim().slice(0, n) || undefined)
const num = (v: any) => { const x = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(x) && x > 0 ? x : null }

export async function stageImport(biz: string, csv: string) {
  const data = csv.trim().slice(0, 40000)
  if (data.length < 10) return { error: 'Paste your spreadsheet as CSV text first.' }
  const system = `You map a property company's spreadsheet into records. Copy values exactly as written. Never invent, guess or fill in a missing value: leave it out. Return only JSON: {"properties": [{"name": "", "address": "", "city": "", "country": "", "bedrooms": null, "bathrooms": null, "monthly_rent": null, "landlord_name": "", "landlord_email": "", "landlord_phone": ""}], "tenants": [{"name": "", "email": "", "phone": "", "property_name": ""}]}. A row describing a property goes in properties. A row describing a person renting goes in tenants, with property_name set to the property it names. At most 150 properties and 200 tenants. Ignore header rows and blank rows. No commentary.`
  const r = await callClaude(system, data, 8000)
  if (r.error || !r.text) return { error: r.error ?? 'No reply from the AI' }
  const a = r.text.indexOf('{'), b = r.text.lastIndexOf('}')
  let j: any = null
  try { j = JSON.parse(r.text.slice(a, b + 1)) } catch {}
  if (!j) return { error: 'The AI could not read that spreadsheet. Check it is CSV text with a header row.' }
  const properties: ImportProperty[] = (Array.isArray(j.properties) ? j.properties : []).slice(0, 150).map((p: any) => ({ name: txt(p.name)!, address: txt(p.address, 300), city: txt(p.city), country: txt(p.country), bedrooms: num(p.bedrooms), bathrooms: num(p.bathrooms), monthly_rent: num(p.monthly_rent), landlord_name: txt(p.landlord_name), landlord_email: txt(p.landlord_email)?.toLowerCase(), landlord_phone: txt(p.landlord_phone) })).filter((p: ImportProperty) => p.name)
  const tenants: ImportTenant[] = (Array.isArray(j.tenants) ? j.tenants : []).slice(0, 200).map((t: any) => ({ name: txt(t.name)!, email: txt(t.email)?.toLowerCase(), phone: txt(t.phone), property_name: txt(t.property_name) })).filter((t: ImportTenant) => t.name)
  if (!properties.length && !tenants.length) return { error: 'No properties or tenants were found in that spreadsheet.' }
  const lines = [`${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} and ${tenants.length} tenant${tenants.length === 1 ? '' : 's'} found. Approving adds them to Property Management. Records that already exist (same name or email) are skipped.`, '', 'Properties:', ...properties.slice(0, 40).map(p => `- ${p.name}${p.city ? ', ' + p.city : ''}${p.monthly_rent ? ` · rent ${p.monthly_rent}` : ''}${p.landlord_name ? ` · landlord ${p.landlord_name}` : ''}`), ...(properties.length > 40 ? [`- and ${properties.length - 40} more`] : []), '', 'Tenants:', ...tenants.slice(0, 40).map(t => `- ${t.name}${t.property_name ? ` · ${t.property_name}` : ''}${t.email ? ` · ${t.email}` : ''}`), ...(tenants.length > 40 ? [`- and ${tenants.length - 40} more`] : [])]
  const q = await queueAiAction({ userId: biz, agentKey: 'onboarding', actionType: 'import_records', title: `Import ${properties.length} properties and ${tenants.length} tenants`, draftBody: lines.join('\n'), payload: { properties, tenants }, context: { summary: 'Mapped from the spreadsheet you pasted. Check the list, then approve to add the records.' } })
  if ('error' in q) return { error: q.error }
  if ('skipped' in q) return { error: String(q.skipped) }
  return { queued: true, properties: properties.length, tenants: tenants.length }
}

// Runs only when a person approves the import.
export async function runImport(biz: string, p: { properties?: ImportProperty[]; tenants?: ImportTenant[] }) {
  const db = svc()
  const [ls, ps, ts] = await Promise.all([
    db.from('pm_landlords').select('id, name, email').eq('user_id', biz),
    db.from('pm_properties').select('id, name').eq('user_id', biz).is('ended_at', null),
    db.from('pm_tenants').select('id, name, email').eq('user_id', biz),
  ])
  const landlord = new Map<string, string>(), prop = new Map<string, string>()
  for (const l of ls.data ?? []) { if (l.email) landlord.set(String(l.email).toLowerCase(), l.id); landlord.set(String(l.name).toLowerCase(), l.id) }
  for (const x of ps.data ?? []) prop.set(String(x.name).toLowerCase(), x.id)
  const haveTenant = new Set((ts.data ?? []).map((t: any) => String(t.email || t.name).toLowerCase()))
  let np = 0, nt = 0, nl = 0
  for (const x of (p.properties ?? []).slice(0, 150)) {
    if (!x?.name || prop.has(x.name.toLowerCase())) continue
    let owner: string | null = null
    const key = (x.landlord_email || x.landlord_name || '').toLowerCase()
    if (key) {
      owner = landlord.get(key) ?? null
      if (!owner && x.landlord_name) {
        const { data, error } = await db.from('pm_landlords').insert({ user_id: biz, name: x.landlord_name, email: x.landlord_email ?? null, phone: x.landlord_phone ?? null }).select('id').single()
        if (error) return { error: `Landlord ${x.landlord_name}: ${error.message}` }
        owner = data.id; landlord.set(key, owner!); nl++
      }
    }
    const { data, error } = await db.from('pm_properties').insert({ user_id: biz, name: x.name, address: x.address ?? x.name, city: x.city ?? null, country: x.country ?? null, owner_id: owner, status: 'Available', monthly_income: x.monthly_rent ?? null, bedrooms: x.bedrooms != null ? String(x.bedrooms) : null, bathrooms: x.bathrooms != null ? String(x.bathrooms) : null }).select('id').single()
    if (error) return { error: `Property ${x.name}: ${error.message}` }
    prop.set(x.name.toLowerCase(), data.id); np++
  }
  for (const t of (p.tenants ?? []).slice(0, 200)) {
    const k = (t.email || t.name).toLowerCase()
    if (!t?.name || haveTenant.has(k)) continue
    const { error } = await db.from('pm_tenants').insert({ user_id: biz, name: t.name, email: t.email ?? null, phone: t.phone ?? null, property_id: t.property_name ? prop.get(t.property_name.toLowerCase()) ?? null : null })
    if (error) return { error: `Tenant ${t.name}: ${error.message}` }
    haveTenant.add(k); nt++
  }
  return { success: true, added: { properties: np, tenants: nt, landlords: nl } }
}
