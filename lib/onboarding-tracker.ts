// Onboarding tracker: one list of every client who is being onboarded (landlords, tenants, co-hosts, investors),
// with how far each has got, who has gone quiet, and the private link they were sent. Server side only.
// Used by /api/onboarding-tracker (the staff board) and the daily reminder job.
import { ALL_SEGMENTS, PERSON_SEGMENTS, LINK_SEGMENT, ownerCol, computeAuto, itemDone, itemEditable } from './onboarding-steps'
import { SITE_URL } from './brand'

export const STUCK_DAYS = 7          // not finished and nothing has moved for this many days
export const RECENT_DAYS = 120       // clients added longer ago are left out unless asked for
const DAY = 864e5

export type TrackerStep = { key: string; label: string; done: boolean; editable: boolean; auto: boolean }
export type TrackerLink = { id: string; status: string; expired: boolean; expires_at: string; reminders: number; last_reminded_at: string | null; url: string; sent_to: string | null }
export type TrackerRow = {
  id: string; customerId: string | null; seg: string; segLabel: string; module: string; moduleLabel: string
  name: string; email: string | null; phone: string | null; created_at: string
  done: number; total: number; complete: boolean; next: string | null; steps: TrackerStep[]
  lastMoved: string; idleDays: number; stuck: boolean; notStarted: boolean; link: TrackerLink | null
}

const ms = (v: any) => { const t = v ? new Date(v).getTime() : 0; return Number.isFinite(t) ? t : 0 }

export async function buildTracker(db: any, biz: string, includeOlder = false): Promise<TrackerRow[]> {
  const now = Date.now()
  const { data: linkRows } = await db.from('onboarding_links').select('*').eq('business_id', biz).order('created_at', { ascending: false }).limit(600)
  const links: any[] = linkRows ?? []
  const toLink = (l: any): TrackerLink => ({ id: l.id, status: l.status, expired: l.status !== 'done' && ms(l.expires_at) < now, expires_at: l.expires_at, reminders: l.reminders ?? 0, last_reminded_at: l.last_reminded_at ?? null, url: `${SITE_URL}/start/${l.token}`, sent_to: l.email ?? null })
  const rows: TrackerRow[] = []

  for (const seg of PERSON_SEGMENTS) {
    const { data: found } = await db.from(seg.table).select('*').eq(ownerCol(seg), biz).order('created_at', { ascending: false }).limit(400)
    const segLinks = links.filter(l => LINK_SEGMENT[`${l.kind}/${l.module}`] === seg.key)
    const linkFor = new Map<string, any>(); segLinks.forEach(l => { if (l.subject_id && !linkFor.has(l.subject_id)) linkFor.set(l.subject_id, l) })
    const custs = (found ?? []).filter((c: any) => includeOlder || now - ms(c.created_at) <= RECENT_DAYS * DAY || (linkFor.get(c.id) && linkFor.get(c.id).status !== 'done'))
    const ids = custs.map((c: any) => c.id)
    const [auto, { data: ovRows }] = await Promise.all([
      computeAuto(db, seg.key, custs),
      ids.length ? db.from('onboarding_overrides').select('customer_id,item_key,done,updated_at').eq('module', seg.key).in('customer_id', ids) : Promise.resolve({ data: [] }),
    ])
    const ov: Record<string, Record<string, boolean>> = {}, ovAt: Record<string, number> = {}
    for (const r of ovRows ?? []) { (ov[r.customer_id] ??= {})[r.item_key] = !!r.done; if (r.done) ovAt[r.customer_id] = Math.max(ovAt[r.customer_id] ?? 0, ms(r.updated_at)) }

    for (const c of custs) {
      const steps: TrackerStep[] = seg.items.map(it => ({ key: it.key, label: it.label, done: itemDone(it, auto[c.id], ov[c.id]), editable: itemEditable(it, auto[c.id]), auto: it.auto }))
      const done = steps.filter(s => s.done).length, link = linkFor.get(c.id) ?? null
      const last = Math.max(ms(c.created_at), ovAt[c.id] ?? 0, ms(link?.completed_at))
      const complete = done === steps.length
      const idle = Math.floor((now - last) / DAY)
      rows.push({
        id: seg.key + ':' + c.id, customerId: c.id, seg: seg.key, segLabel: seg.label, module: seg.module, moduleLabel: seg.moduleLabel,
        name: String(c.name || 'Unnamed').trim(), email: c.email ?? null, phone: c.phone ?? null, created_at: c.created_at,
        done, total: steps.length, complete, next: steps.find(s => !s.done)?.label ?? null, steps,
        lastMoved: new Date(last).toISOString(), idleDays: idle, stuck: !complete && idle >= STUCK_DAYS, notStarted: false, link: link ? toLink(link) : null,
      })
    }

    // Links sent but never opened: there is no client record yet, so show the link itself
    for (const l of segLinks.filter(l => !l.subject_id && l.status !== 'done')) {
      const idle = Math.floor((now - ms(l.created_at)) / DAY), expired = ms(l.expires_at) < now
      if (!includeOlder && expired && now - ms(l.expires_at) > 30 * DAY) continue
      rows.push({
        id: 'link:' + l.id, customerId: null, seg: seg.key, segLabel: seg.label, module: seg.module, moduleLabel: seg.moduleLabel,
        name: String(l.name || l.email || 'Not named yet').trim(), email: l.email ?? null, phone: l.phone ?? null, created_at: l.created_at,
        done: 0, total: seg.items.length, complete: false, next: 'Open their private link and add their details', steps: [],
        lastMoved: l.created_at, idleDays: idle, stuck: idle >= STUCK_DAYS || expired, notStarted: true, link: toLink(l),
      })
    }
  }
  // Stuck first, then the longest quiet, then finished
  return rows.sort((a, b) => Number(b.stuck) - Number(a.stuck) || Number(a.complete) - Number(b.complete) || b.idleDays - a.idleDays)
}

export const SEGMENT_LABELS = ALL_SEGMENTS.map(s => ({ key: s.key, label: `${s.moduleLabel}: ${s.label}` }))
