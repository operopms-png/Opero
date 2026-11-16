export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Dynamic Dossier (Real Estate Intelligence → Vacation Rentals). Each company sees only its own properties, bookings and rules.
//   GET                          -> { properties, settings, bookings }  short-stay properties, their pricing rules and recent and upcoming bookings
//   POST {action:'save', propertyId, ...rules}  -> save one property's rules
// Prices are suggestions only. Nothing is sent to Airbnb or any channel from here.
export const maxDuration = 30
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const num = (v: any) => (v === '' || v == null || isNaN(Number(v)) ? null : Math.max(0, Number(v)))
const pct = (v: any, d: number) => (v === '' || v == null || isNaN(Number(v)) ? d : Math.min(50, Math.max(0, Number(v))))

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const { data: props, error } = await db.from('properties').select('id,name,city,nightly_rate,status').eq('user_id', c.businessId).is('ended_at', null).order('name').limit(500)
  if (error) return bad(error.message, 500)
  const ids = (props ?? []).map(p => p.id)
  const from = new Date(Date.now() - 75 * 864e5).toISOString().slice(0, 10), to = new Date(Date.now() + 75 * 864e5).toISOString().slice(0, 10)
  const [{ data: settings }, { data: bookings }] = await Promise.all([
    db.from('dossier_settings').select('*').eq('business_id', c.businessId).limit(1000),
    ids.length ? db.from('bookings').select('property_id,check_in,check_out,status,total_amount').in('property_id', ids).lte('check_in', to).gte('check_out', from).limit(10000) : Promise.resolve({ data: [] as any[] }),
  ])
  return NextResponse.json({ properties: props ?? [], settings: settings ?? [], bookings: bookings ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'save') return bad('Unknown action.')
  const { data: own } = await db.from('properties').select('id').eq('id', String(b.propertyId || '')).eq('user_id', c.businessId).maybeSingle()
  if (!own) return bad('Property not found.', 404)
  const base = num(b.base_price), floor = num(b.floor_price), ceil = num(b.ceiling_price)
  if (floor != null && ceil != null && floor > ceil) return bad('The floor cannot be higher than the ceiling.')
  if (base != null && floor != null && base < floor) return bad('The base price cannot be below the floor.')
  if (base != null && ceil != null && base > ceil) return bad('The base price cannot be above the ceiling.')
  const row = { business_id: c.businessId, property_id: own.id, enabled: !!b.enabled, base_price: base, floor_price: floor, ceiling_price: ceil, weekend_pct: pct(b.weekend_pct, 15), last_minute_pct: pct(b.last_minute_pct, 10), gap_pct: pct(b.gap_pct, 10), demand_pct: pct(b.demand_pct, 10), updated_by: (c as any).name ?? null, updated_at: new Date().toISOString() }
  const { error } = await db.from('dossier_settings').upsert(row, { onConflict: 'business_id,property_id' })
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
