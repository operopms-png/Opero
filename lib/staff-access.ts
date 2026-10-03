// Server-side check for a Staff Centre tab permission (mirrors getScTabs in
// lib/useRole.ts, which is client-only). Admins have every tab; staff with an
// explicit list ("sc:finance", …) only have the ones ticked; staff without a
// custom list get the role defaults. Partners never get staff tabs.
import { serviceClient } from '@/lib/admin-auth'
import type { Caller } from '@/lib/mailbox'

export async function hasScTab(c: Caller, tab: string) {
  if (c.isAdmin) return true
  if (/partner/i.test(c.role)) return false
  const { data } = await serviceClient.from('team_members').select('custom_modules').eq('email', c.email).order('created_at', { ascending: false }).limit(1)
  const mods: string[] | null = data?.[0]?.custom_modules ?? null
  if (!mods || !mods.length) return tab !== 'finance' && !/cleaning|maintenance team|viewer/i.test(c.role)
  if (!mods.includes('sc')) return false
  const explicit = mods.filter(m => m.startsWith('sc:'))
  return explicit.length ? explicit.includes('sc:' + tab) : tab !== 'finance'
}
