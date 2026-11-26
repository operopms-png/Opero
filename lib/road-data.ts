// Reads the numbers behind Road to 100 and the Homes secured KPI from one place, for one company.
import { serviceClient as db } from '@/lib/admin-auth'

// Homes already managed. Property Management and Estate Agency keep the same homes in step (names can differ slightly, e.g. a typo),
// so the larger of the two lists is the number of homes, not the two added together.
export async function managedHomes(biz: string): Promise<number> {
  const [a, b] = await Promise.all([
    db.from('pm_properties').select('id', { count: 'exact', head: true }).eq('user_id', biz).is('ended_at', null),
    db.from('estate_properties').select('id', { count: 'exact', head: true }).eq('user_id', biz),
  ])
  return Math.max(a.count ?? 0, b.count ?? 0)
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
