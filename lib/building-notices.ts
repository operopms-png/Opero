// Building notices: staff post a notice for chosen homes; the tenants, landlords and linked partners of those homes see it at the top
// of their Maintenance tab and get an email. A home is the Property Management property; its Estate Agency twin shares it.
// Partners only see notices posted on or after the day they were linked to that home. Server only.
import { serviceClient as db } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import type { Viewer } from '@/lib/maintenance-feed'

export type Notice = { id: string; title: string; body: string; building_name: string | null; created_at: string }
const esc = (t: string) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

export async function noticesFor(v: Viewer): Promise<Notice[]> {
  const pmIds = v.pairs.map(p => p.pm).filter(Boolean) as string[]
  if (!pmIds.length) return []
  const flag = v.role === 'tenant' ? 'for_tenants' : v.role === 'landlord' ? 'for_landlords' : 'for_partners'
  const { data } = await db.from('building_notices').select('id,title,body,building_name,property_ids,created_at').eq('business_id', v.businessId).eq('archived', false).eq(flag, true).overlaps('property_ids', pmIds).order('created_at', { ascending: false }).limit(30)
  return (data ?? []).filter((n: any) => {
    if (v.role !== 'partner') return true
    return v.pairs.some(p => p.pm && (n.property_ids ?? []).includes(p.pm) && !(p.since && String(n.created_at).slice(0, 10) < p.since))
  }).map(({ property_ids, ...n }: any) => n)
}

type To = { email: string; name: string; kind: 'tenant' | 'landlord' | 'partner' }

// Everyone who should get the email for this notice.
async function recipients(n: any): Promise<To[]> {
  const ids: string[] = n.property_ids ?? [], out: To[] = []
  if (!ids.length) return out
  const { data: props } = await db.from('pm_properties').select('id, owner_id, estate_property_id').in('id', ids).eq('user_id', n.business_id)
  if (n.for_landlords) {
    const owners = new Set<string>()
    for (const p of props ?? []) if (p.owner_id) owners.add(p.owner_id)
    if (owners.size) { const { data } = await db.from('pm_landlords').select('name, email').in('id', [...owners]); for (const l of data ?? []) if (l.email) out.push({ email: l.email, name: l.name, kind: 'landlord' }) }
    const estateIds = (props ?? []).map((p: any) => p.estate_property_id).filter(Boolean)
    if (estateIds.length) {
      const { data: ep } = await db.from('estate_properties').select('owner_id').in('id', estateIds)
      const eo = [...new Set((ep ?? []).map((x: any) => x.owner_id).filter(Boolean))]
      if (eo.length) { const { data } = await db.from('estate_landlords').select('name, email').in('id', eo); for (const l of data ?? []) if (l.email) out.push({ email: l.email, name: l.name, kind: 'landlord' }) }
    }
  }
  if (n.for_tenants) {
    const { data } = await db.from('pm_tenants').select('name, email, notify_email').in('property_id', ids).ilike('status', 'active')
    for (const t of data ?? []) if (t.email && t.notify_email !== false) out.push({ email: t.email, name: t.name, kind: 'tenant' })
    const estateIds = (props ?? []).map((p: any) => p.estate_property_id).filter(Boolean)
    if (estateIds.length) { const { data: et } = await db.from('estate_tenants').select('name, email, notify_email').in('property_id', estateIds).ilike('status', 'active'); for (const t of et ?? []) if (t.email && t.notify_email !== false) out.push({ email: t.email, name: t.name, kind: 'tenant' }) }
  }
  if (n.for_partners) {
    const { data } = await db.from('owner_profiles').select('name, email, pm_property_ids').eq('business_id', n.business_id).overlaps('pm_property_ids', ids)
    for (const o of data ?? []) if (o.email) out.push({ email: o.email, name: o.name, kind: 'partner' })
  }
  const seen = new Set<string>()
  return out.filter(r => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

const LINK = { tenant: `${SITE_URL}/pm-tenant-portal`, landlord: `${SITE_URL}/pm-owner-portal`, partner: `${SITE_URL}/partners` }

export async function emailNotice(n: any): Promise<number> {
  const to = await recipients(n); let sent = 0
  for (const r of to) {
    const body = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#14171f"><p>Hello ${esc(r.name || 'there')},</p><p><b>${esc(n.title)}</b>${n.building_name ? ` (${esc(n.building_name)})` : ''}</p><p style="white-space:pre-line">${esc(n.body)}</p><p><a href="${LINK[r.kind]}">Open your portal</a> and go to the Maintenance tab to see this notice and any repairs.</p></div>`
    try { const x: any = await sendEmail(r.email, `Notice: ${n.title}`.slice(0, 120), body); if (!x?.error && !x?.skipped) sent++ } catch {}
  }
  await db.from('building_notices').update({ emailed_at: new Date().toISOString() }).eq('id', n.id)
  return sent
}
