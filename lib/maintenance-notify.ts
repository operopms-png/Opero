// Emails the tenant, the landlord and linked partners when a repair is reported, starts, or is fixed, and alerts staff to new reports.
// A database trigger writes one row to maintenance_events for every change, wherever it was made (tenant portal, staff pages, crew, Voice),
// and this runs every few minutes to send them. Tenants respect their email setting; partners only hear about issues they may see.
import { serviceClient as db } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'

const esc = (t: string) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
const TABLE: Record<string, string> = { pm: 'pm_maintenance', estate: 'estate_maintenance' }
const STAGE: Record<string, string> = { reported: 'Reported', in_progress: 'In progress', resolved: 'Fixed' }

type To = { email: string; name: string; link: string; kind: 'tenant' | 'landlord' | 'partner' }

function html(name: string, headline: string, lines: string[], link: string) {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#14171f"><p>Hello ${esc(name || 'there')},</p><p><b>${esc(headline)}</b></p>${lines.map(l => `<p style="margin:0 0 8px">${esc(l)}</p>`).join('')}<p style="margin-top:16px"><a href="${link}" style="background:#1B2F6E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">See it in your portal</a></p></div>`
}

async function recipients(source: string, issue: any): Promise<{ to: To[]; propertyName: string }> {
  const out: To[] = []
  let pmId: string | null = null, estateId: string | null = null, name = ''
  if (source === 'pm') {
    const { data: p } = await db.from('pm_properties').select('id, name, estate_property_id, owner_id').eq('id', issue.property_id).maybeSingle()
    pmId = p?.id ?? null; estateId = p?.estate_property_id ?? null; name = p?.name ?? ''
    if (p?.owner_id) { const { data: l } = await db.from('pm_landlords').select('name, email').eq('id', p.owner_id).maybeSingle(); if (l?.email) out.push({ email: l.email, name: l.name, kind: 'landlord', link: `${SITE_URL}/pm-owner-portal` }) }
  } else {
    const { data: e } = await db.from('estate_properties').select('id, name, pm_property_id, owner_id').eq('id', issue.property_id).maybeSingle()
    estateId = e?.id ?? null; pmId = e?.pm_property_id ?? null; name = e?.name ?? ''
    if (e?.owner_id) { const { data: l } = await db.from('estate_landlords').select('name, email').eq('id', e.owner_id).maybeSingle(); if (l?.email) out.push({ email: l.email, name: l.name, kind: 'landlord', link: `${SITE_URL}/estate-owner-portal` }) }
  }
  // The same home in the other module: its landlord too (once).
  if (pmId && source !== 'pm') { const { data: p } = await db.from('pm_properties').select('owner_id').eq('id', pmId).maybeSingle(); if (p?.owner_id) { const { data: l } = await db.from('pm_landlords').select('name, email').eq('id', p.owner_id).maybeSingle(); if (l?.email) out.push({ email: l.email, name: l.name, kind: 'landlord', link: `${SITE_URL}/pm-owner-portal` }) } }
  if (estateId && source !== 'estate') { const { data: e } = await db.from('estate_properties').select('owner_id').eq('id', estateId).maybeSingle(); if (e?.owner_id) { const { data: l } = await db.from('estate_landlords').select('name, email').eq('id', e.owner_id).maybeSingle(); if (l?.email) out.push({ email: l.email, name: l.name, kind: 'landlord', link: `${SITE_URL}/estate-owner-portal` }) } }
  if (pmId) {
    const { data: t } = await db.from('pm_tenants').select('name, email, notify_email').eq('property_id', pmId).ilike('status', 'active')
    for (const x of t ?? []) if (x.email && x.notify_email !== false) out.push({ email: x.email, name: x.name, kind: 'tenant', link: `${SITE_URL}/pm-tenant-portal` })
    const { data: ps } = await db.from('owner_profiles').select('name, email, pm_property_ids, pm_property_since').contains('pm_property_ids', [pmId])
    for (const o of ps ?? []) {
      const since = (o.pm_property_since ?? {})[pmId]
      if (o.email && !(since && String(issue.created_at).slice(0, 10) < since)) out.push({ email: o.email, name: o.name, kind: 'partner', link: `${SITE_URL}/partners` })
    }
  }
  if (estateId) {
    const { data: t } = await db.from('estate_tenants').select('name, email, notify_email').eq('property_id', estateId).ilike('status', 'active')
    for (const x of t ?? []) if (x.email && x.notify_email !== false) out.push({ email: x.email, name: x.name, kind: 'tenant', link: `${SITE_URL}/estate-tenant-portal` })
  }
  const seen = new Set<string>()
  return { to: out.filter(r => { const k = `${r.kind}:${r.email.toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true }), propertyName: name }
}

export async function runMaintenanceNotify(limit = 40) {
  const result = { events: 0, emails: 0, errors: [] as string[] }
  const { data: events } = await db.from('maintenance_events').select('*').is('processed_at', null).order('created_at').limit(limit)
  for (const ev of events ?? []) {
    // Claim it first so a second run cannot send it again.
    const { data: claimed } = await db.from('maintenance_events').update({ processed_at: new Date().toISOString() }).eq('id', ev.id).is('processed_at', null).select('id')
    if (!claimed?.length) continue
    result.events++
    try {
      const { data: issue } = await db.from(TABLE[ev.source]).select('*').eq('id', ev.maintenance_id).maybeSingle()
      if (!issue) continue
      const { to, propertyName } = await recipients(ev.source, issue)
      const where = propertyName || 'your property'
      if (ev.event === 'reported') {
        await db.from('notifications').insert({ user_id: issue.user_id, title: `New maintenance issue: ${String(issue.title).slice(0, 120)}`, message: `${where}${issue.priority ? ` · ${issue.priority} priority` : ''}`, type: 'maintenance', module: 'staffcentre', property_name: propertyName || null, link: '/staff-centre/maintenance', read: false })
      }
      for (const r of to) {
        // Landlords and partners hear about every stage; tenants too. Nobody is emailed about things they cannot see.
        const subject = ev.event === 'reported' ? (r.kind === 'tenant' ? `We have your repair report: ${issue.title}` : `New repair reported at ${where}`)
          : ev.event === 'in_progress' ? `Repair started at ${where}: ${issue.title}` : `Repair fixed at ${where}: ${issue.title}`
        const lines = [`${issue.title}${issue.description ? ': ' + String(issue.description).slice(0, 300) : ''}`, `Stage: ${STAGE[ev.event]}`]
        if (ev.event === 'resolved' && issue.resolution_notes) lines.push(`Fix: ${String(issue.resolution_notes).slice(0, 400)}`)
        const res: any = await sendEmail(r.email, subject, html(r.name, subject, lines, r.link)).catch((e: any) => ({ error: String(e?.message || e) }))
        if (res?.error) result.errors.push(`${r.email}: ${res.error}`); else if (!res?.skipped) result.emails++
      }
    } catch (e: any) { result.errors.push(String(e?.message || e)) }
  }
  return result
}
