// Automatic onboarding reminders (run daily by netlify/functions/onboarding-reminders.mts).
//  1. Anyone sent a private onboarding link who has not finished gets a reminder email: first after 2 days, then every
//     3 days, up to 4 reminders, and never after the link expires.
//  2. Staff get a bell alert (at most once every 3 days) when clients have gone quiet for 7 days, pointing at the tracker.
import { serviceClient as db } from './admin-auth'
import { emailPerson, type PortalSubject } from './doc-hub'
import { buildTracker } from './onboarding-tracker'
import { SITE_URL } from './brand'

export const FIRST_AFTER_DAYS = 2, EVERY_DAYS = 3, MAX_REMINDERS = 4
const SUBJECT: Record<string, PortalSubject> = { 'owner/pm': 'landlord', 'owner/ea': 'ea_landlord', 'owner/str': 'landlord', 'tenant/pm': 'tenant', 'tenant/ea': 'ea_tenant', 'cohost/str': 'cohost' }

/** Emails one person their private link again. Returns true when the email went out. */
export async function sendLinkReminder(l: any): Promise<boolean> {
  const subject = SUBJECT[`${l.kind}/${l.module}`]
  if (!subject || !l.email || !l.token) return false
  const lines = ['Add your details', ...(l.ask_docs ? ['Upload your documents'] : []), ...(l.template_id ? ['Read and sign your agreement'] : [])]
  const ok = await emailPerson(l.business_id, subject, { name: l.name || '', email: l.email }, 'A quick reminder to finish your setup', ['It only takes a few minutes. You still need to:', ...lines], 'Continue your setup', `${SITE_URL}/start/${l.token}`)
  if (ok) await db.from('onboarding_links').update({ reminders: (l.reminders ?? 0) + 1, last_reminded_at: new Date().toISOString() }).eq('id', l.id)
  return ok
}

export async function runOnboardingReminders() {
  const now = Date.now()
  const { data: links } = await db.from('onboarding_links').select('*').in('status', ['open', 'started']).gt('expires_at', new Date().toISOString()).limit(2000)
  let reminded = 0
  for (const l of links ?? []) {
    const n = l.reminders ?? 0
    if (n >= MAX_REMINDERS || !l.email) continue
    const last = new Date(l.last_reminded_at ?? l.created_at).getTime()
    if (now - last < (n === 0 ? FIRST_AFTER_DAYS : EVERY_DAYS) * 864e5 - 36e5) continue
    if (await sendLinkReminder(l)) reminded++
  }

  // Staff alert: which companies have clients who have gone quiet
  const biz = new Set<string>()
  const [{ data: lb }, { data: tm }] = await Promise.all([db.from('onboarding_links').select('business_id').limit(2000), db.from('team_members').select('user_id').limit(5000)])
  for (const r of lb ?? []) if (r.business_id) biz.add(r.business_id)
  for (const r of tm ?? []) if (r.user_id) biz.add(r.user_id)
  let alerted = 0
  for (const b of biz) {
    const stuck = (await buildTracker(db, b).catch(() => [])).filter(r => r.stuck)
    if (!stuck.length) continue
    const { data: recent } = await db.from('notifications').select('id').eq('user_id', b).eq('type', 'onboarding_stuck').gte('created_at', new Date(now - 3 * 864e5).toISOString()).limit(1)
    if (recent?.length) continue
    const names = stuck.slice(0, 3).map(r => r.name).join(', ') + (stuck.length > 3 ? ` and ${stuck.length - 3} more` : '')
    await db.from('notifications').insert({ user_id: b, title: `${stuck.length} client${stuck.length === 1 ? '' : 's'} stuck in onboarding`, message: `Nothing has moved for ${7} days or more: ${names}.`, type: 'onboarding_stuck', module: 'staffcentre', link: '/staff-centre/onboarding-tracker', read: false })
    alerted++
  }
  return { reminded, alerted }
}
