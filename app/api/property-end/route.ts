import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// "No longer managed": a property that has left the portfolio (owner took it back, contract ended, sold...).
// It is kept with all its history (bookings, rent, documents), hidden from active lists, counts, the website and the AI,
// and shown under Real Estate Intelligence → Properties → Former. It can be restored. Nothing is deleted.
//   POST {table: 'properties' | 'pm_properties' | 'estate_properties', id, action: 'end' | 'restore', ended_at?, reason?, note?}
// A long-let property and its Estate Agency twin are one property, so ending one ends the other.
const TABLES = ['properties', 'pm_properties', 'estate_properties']
const END_REASONS = ['Owner took it back', 'Contract ended', 'Sold', 'Lease not renewed', 'Other']
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!(c.isAdmin || /co founder|property management|vacation rental|development/i.test(c.role))) return bad('Only admins and property teams can do this.', 403)
  const b = await req.json().catch(() => ({}))
  const table = String(b.table || ''), id = String(b.id || ''), action = b.action === 'restore' ? 'restore' : 'end'
  if (!TABLES.includes(table) || !id) return bad('table and id are required')

  const { data: p } = await db.from(table).select('*').eq('id', id).maybeSingle()
  if (!p || p.user_id !== c.businessId) return bad('Property not found.', 404)

  const ended = action === 'end'
  const reason = ended ? (END_REASONS.includes(String(b.reason)) ? String(b.reason) : 'Other') : null
  const date = ended ? (/^\d{4}-\d{2}-\d{2}$/.test(String(b.ended_at)) ? String(b.ended_at) : new Date().toISOString().slice(0, 10)) : null
  const fields: Record<string, unknown> = { ended_at: date, ended_reason: reason, ended_note: ended ? String(b.note || '').trim().slice(0, 1000) || null : null }
  // Off the website and the booking page as well (restoring does not switch these back on: relist on purpose)
  const extra: Record<string, Record<string, unknown>> = {
    properties: ended ? { show_on_website: false, is_bookable: false } : {},
    estate_properties: ended ? { show_on_website: false, listed: false } : {},
    pm_properties: {},
  }
  const { error } = await db.from(table).update({ ...fields, ...extra[table] }).eq('id', id)
  if (error) return bad(error.message, 500)

  // the linked twin (long let <-> estate agency record)
  const twin = table === 'pm_properties' ? ['estate_properties', p.estate_property_id] : table === 'estate_properties' ? ['pm_properties', p.pm_property_id] : null
  if (twin && twin[1]) await db.from(twin[0] as string).update({ ...fields, ...extra[twin[0] as string] }).eq('id', twin[1] as string).eq('user_id', c.businessId)

  return NextResponse.json({ ok: true, ended_at: date, ended_reason: reason })
}
