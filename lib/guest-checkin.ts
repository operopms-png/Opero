// Guest online check-in for short lets: each booking gets a private link where the guest gives their details,
// uploads ID, saves a card for the security deposit and signs the house rules and terms.
// Server-only. The link's token is the guest's only credential, so it is long and random.
// ID photos live in the private 'guest-ids' bucket and are deleted ID_KEEP_DAYS after check-out.
import { serviceClient as db } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import { teamEmails } from '@/lib/feedback-notify'

export const ID_KEEP_DAYS = 30
export const ID_BUCKET = 'guest-ids'
export const checkinUrl = (token: string) => `${SITE_URL}/checkin/${token}`
const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const addDays = (d: string, n: number) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10)
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export type BookingTable = 'bookings' | 'direct_bookings'

// One check-in row per booking. Created the first time it is needed.
export async function ensureCheckin(table: BookingTable, booking: any, property: any) {
  const { data: have } = await db.from('guest_checkins').select('*').eq('booking_table', table).eq('booking_id', booking.id).maybeSingle()
  if (have) return have
  const { data, error } = await db.from('guest_checkins').insert({
    user_id: property.user_id, property_id: property.id, booking_table: table, booking_id: booking.id,
    guest_name: booking.guest_name ?? null, guest_email: booking.guest_email ?? null, guest_phone: booking.guest_phone ?? null,
    deposit_amount: Number(property.security_deposit) || 0,
    terms_text: String(property.checkin_terms || property.house_rules || '').trim() || null,
    id_delete_after: addDays(booking.check_out || booking.check_in, ID_KEEP_DAYS),
  }).select('*').single()
  if (error) {
    const { data: again } = await db.from('guest_checkins').select('*').eq('booking_table', table).eq('booking_id', booking.id).maybeSingle()
    if (again) return again
    throw error
  }
  return data
}

export async function sendCheckinEmail(row: any, property: any, booking: any, reminder = false) {
  if (!row.guest_email) return { skipped: true }
  const url = checkinUrl(row.token)
  const first = String(row.guest_name || '').split(' ')[0] || 'there'
  const needs = ['your details', 'a photo of your ID', Number(row.deposit_amount) > 0 ? 'a card for the security deposit (nothing is taken now)' : null, 'agreeing to the house rules'].filter(Boolean).join(', ')
  const subject = reminder ? `Reminder: complete your check-in for ${property.name}` : `Check in online for ${property.name}`
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1D2433">
    <h2 style="margin:0 0 6px;font-size:19px;color:#1D4E89">${reminder ? 'Please finish your check-in' : 'Check in online'}</h2>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55">Hi ${esc(first)}, your stay at <b>${esc(property.name)}</b> is ${fmt(booking.check_in)} to ${fmt(booking.check_out)}. So that we can welcome you smoothly, please complete a short online check-in before you arrive. It takes about two minutes: ${esc(needs)}.</p>
    <p style="margin:18px 0"><a href="${url}" style="background:#2F6DB5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600">Start check-in</a></p>
    <p style="margin:0;font-size:12px;color:#667085;line-height:1.5">Your ID photo is private, seen only by the property team, and deleted ${ID_KEEP_DAYS} days after your stay. If the button does not work, copy this link: ${url}</p></div>`
  const r: any = await sendEmail(row.guest_email, subject, html).catch(() => null)
  const ok = !!r && !r.error && !r.skipped
  if (ok) await db.from('guest_checkins').update(reminder ? { reminder_sent_at: new Date().toISOString() } : { link_sent_at: new Date().toISOString() }).eq('id', row.id)
  return { sent: ok }
}

export async function notifyTeamCheckinComplete(row: any, property: any, booking: any) {
  try {
    const to = await teamEmails(row.user_id)
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1D2433">
      <h2 style="margin:0 0 6px;font-size:18px;color:#1D4E89">Check-in complete: ${esc(row.guest_name || 'Guest')}</h2>
      <p style="margin:0 0 12px;font-size:14px">${esc(property.name)} · ${fmt(booking.check_in)} to ${fmt(booking.check_out)}${row.arrival_time ? ` · arriving about ${esc(row.arrival_time)}` : ''}</p>
      <p style="margin:0;font-size:14px">ID uploaded${Number(row.deposit_amount) > 0 ? ', deposit card saved' : ''}, house rules signed. <a href="${SITE_URL}/pm?tab=Guest%20Check-ins" style="color:#2F6DB5">Open Guest Check-ins</a></p></div>`
    for (const a of to) await sendEmail(a, `Check-in complete: ${row.guest_name || 'Guest'} at ${property.name}`, html).catch(() => null)
  } catch { /* never block the guest */ }
}

// Daily: send links to guests arriving within 3 days, remind anyone still incomplete, delete old ID photos.
export async function runGuestCheckinScan() {
  const today = new Date().toISOString().slice(0, 10)
  const horizon = addDays(today, 3)
  let sent = 0, reminded = 0, cleaned = 0

  const { data: props } = await db.from('properties').select('id, name, user_id, security_deposit, checkin_terms, house_rules').eq('online_checkin', true).is('ended_at', null)
  const byId = new Map((props ?? []).map((p: any) => [p.id, p]))
  const ids = Array.from(byId.keys())
  if (ids.length) {
    const [{ data: a }, { data: b }] = await Promise.all([
      db.from('bookings').select('*').in('property_id', ids).neq('status', 'cancelled').gte('check_in', today).lte('check_in', horizon).not('guest_email', 'is', null),
      db.from('direct_bookings').select('*').in('property_id', ids).eq('status', 'confirmed').gte('check_in', today).lte('check_in', horizon).not('guest_email', 'is', null),
    ])
    const all: { t: BookingTable; b: any }[] = [...(a ?? []).map((b: any) => ({ t: 'bookings' as const, b })), ...(b ?? []).map((b: any) => ({ t: 'direct_bookings' as const, b }))]
    for (const { t, b: bk } of all) {
      const property: any = byId.get(bk.property_id); if (!property) continue
      try {
        const row = await ensureCheckin(t, bk, property)
        if (row.status === 'complete') continue
        if (!row.link_sent_at) { if ((await sendCheckinEmail(row, property, bk)).sent) sent++; continue }
        const daysToArrival = (new Date(bk.check_in).getTime() - new Date(today).getTime()) / 864e5
        const last = row.reminder_sent_at ? new Date(row.reminder_sent_at).getTime() : 0
        if (daysToArrival <= 2 && Date.now() - last > 20 * 3600e3 && Date.now() - new Date(row.link_sent_at).getTime() > 12 * 3600e3) {
          if ((await sendCheckinEmail(row, property, bk, true)).sent) reminded++
        }
      } catch (e) { console.error('[guest-checkins] scan', e) }
    }
  }

  const { data: old } = await db.from('guest_checkins').select('id, id_files').lte('id_delete_after', today).neq('id_files', '[]')
  for (const r of old ?? []) {
    const paths = ((r.id_files as any[]) ?? []).map(f => f.path).filter(Boolean)
    if (paths.length) await db.storage.from(ID_BUCKET).remove(paths).catch(() => null)
    await db.from('guest_checkins').update({ id_files: [] }).eq('id', r.id); cleaned++
  }
  return { ok: true, sent, reminded, idsDeleted: cleaned }
}
