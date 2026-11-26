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

// Client Properties rows in the Signed stage that have not yet been turned into a managed home (those are already in managedHomes).
export async function signedProps(biz: string) {
  const { data } = await db.from('client_properties').select('stage,signed_at,converted_to').eq('business_id', biz).limit(5000)
  const rows = data || [], since = Date.now() - 30 * 864e5
  const signed = rows.filter((r: any) => r.stage === 'signed' && !r.converted_to)
  return {
    signed: signed.length,
    signedLast30: signed.filter((r: any) => r.signed_at && new Date(r.signed_at).getTime() >= since).length,
    open: rows.filter((r: any) => r.stage !== 'signed' && r.stage !== 'passed').length,
  }
}
