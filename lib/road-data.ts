// Reads the numbers behind Road to 100 and the Homes secured KPI from one place, for one company.
import { serviceClient as db } from '@/lib/admin-auth'

const clean = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
function lev(a: string, b: string) {
  const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur }
  return prev[n]
}
const digits = (s: string) => (s.match(/\d+/g) || []).join('-')
// Different unit numbers (A202 and B206) are different homes even though the names are close.
const same = (a: string, b: string) => a === b || digits(a) === digits(b) && ((a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) || 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.8)

// Homes already managed. Property Management and Estate Agency keep their own property lists, so the same home can be spelled differently
// in each. Homes are matched by similar name (equal, one inside the other, or a one or two letter spelling difference); a leftover pair that
// starts with the same long word (for example BELVEDERE ESTATE and BELVEDERE HEIGHTS) is treated as the same home. Each home counts once.
export async function managedHomes(biz: string): Promise<number> {
  const [a, b] = await Promise.all([
    db.from('pm_properties').select('name').eq('user_id', biz).is('ended_at', null).limit(5000),
    db.from('estate_properties').select('name').eq('user_id', biz).limit(5000),
  ])
  const pm = (a.data || []).map((r: any) => clean(r.name)).filter(Boolean), ea = (b.data || []).map((r: any) => clean(r.name)).filter(Boolean)
  const used = new Set<number>()
  const unmatched: string[] = []
  for (const e of ea) {
    const i = pm.findIndex((p, k) => !used.has(k) && same(p, e))
    if (i >= 0) used.add(i); else unmatched.push(e)
  }
  let extra = 0
  const left = pm.filter((_, k) => !used.has(k))
  for (const e of unmatched) {
    const first = e.split(' ')[0]
    const i = first.length >= 6 ? left.findIndex(p => p.split(' ')[0] === first) : -1
    if (i >= 0) left.splice(i, 1); else extra++
  }
  return pm.length + extra
}

const norm = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Landlord Leads marked Signed that already have a Client Properties row are marked 'linked' so they are not counted twice.
export async function linkLeads(biz: string, leads: any[]): Promise<any[]> {
  const { data } = await db.from('client_properties').select('lead_id').eq('business_id', biz).not('lead_id', 'is', null).limit(5000)
  const linked = new Set((data || []).map((r: any) => r.lead_id))
  return leads.map(l => (l.status === 'signed' && l.id && linked.has(l.id) ? { ...l, status: 'linked' } : l))
}

// Client Properties rows in the Signed stage that are not yet a managed home. A signed row is treated as already managed when it was
// converted, or when its address and a managed home's name or address contain one another (handles a home added by hand).
export async function signedProps(biz: string) {
  const [{ data }, pm, ea] = await Promise.all([
    db.from('client_properties').select('stage,signed_at,converted_to,address').eq('business_id', biz).limit(5000),
    db.from('pm_properties').select('name,address').eq('user_id', biz).is('ended_at', null).limit(5000),
    db.from('estate_properties').select('name,address').eq('user_id', biz).limit(5000),
  ])
  const homes = [...(pm.data || []), ...(ea.data || [])].flatMap((h: any) => [norm(h.name), norm(h.address)]).filter(s => s.length >= 6)
  const isManaged = (addr: any) => { const a = norm(addr); return a.length >= 6 && homes.some(h => h.includes(a) || a.includes(h)) }
  const rows = data || [], since = Date.now() - 30 * 864e5
  const signed = rows.filter((r: any) => r.stage === 'signed' && !r.converted_to && !isManaged(r.address))
  return {
    signed: signed.length,
    signedLast30: signed.filter((r: any) => r.signed_at && new Date(r.signed_at).getTime() >= since).length,
    open: rows.filter((r: any) => r.stage !== 'signed' && r.stage !== 'passed').length,
  }
}

// Owner enquiries in the last 30 days from every channel: the earnings checker (Landlord Leads), landlord contacts the enquiry forms add
// to the CRM, and website chats that were about an owner. A person who shows up in more than one is counted once.
export async function ownerEnquiries30(biz: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const [l, k, w] = await Promise.all([
    db.from('landlord_estimates').select('crm_contact_id').eq('business_id', biz).gte('created_at', since).limit(5000),
    db.from('crm_contacts').select('id').eq('user_id', biz).ilike('type', 'landlord').gte('created_at', since).limit(5000),
    db.from('website_chats').select('crm_contact_id,interest').eq('business_id', biz).gte('created_at', since).or('interest.ilike.%landlord%,interest.ilike.%owner%').limit(5000),
  ])
  const seen = new Set<string>()
  for (const r of l.data || []) if (r.crm_contact_id) seen.add(r.crm_contact_id)
  let n = (l.data || []).length
  for (const r of k.data || []) if (!seen.has(r.id)) { seen.add(r.id); n++ }
  for (const r of w.data || []) if (!r.crm_contact_id) n++; else if (!seen.has(r.crm_contact_id)) { seen.add(r.crm_contact_id); n++ }
  return n
}
