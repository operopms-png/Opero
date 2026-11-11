export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// What a co-host sees: their record, the properties we manage for them, bookings, earnings and maintenance.
// The co-host signs in; staff previewing pass ?id= and must be in the same company.
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return bad('Not signed in', 401)
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await asUser.auth.getUser(token)
  if (!user) return bad('Not signed in', 401)
  let { data: rec } = await db.from('cohosts').select('*').eq('portal_user_id', user.id).maybeSingle()
  let preview = false
  if (!rec) {
    const id = req.nextUrl.searchParams.get('id'); const c = id ? await getCaller(req) : null
    if (c && id) { const r = await db.from('cohosts').select('*').eq('id', id).eq('user_id', c.businessId).maybeSingle(); rec = r.data; preview = true }
  }
  if (!rec) return bad('Not found', 404)
  const ids: string[] = rec.property_ids ?? []
  const [props, bookings, tickets, settings] = await Promise.all([
    ids.length ? db.from('properties').select('id,name,address,city').in('id', ids) : { data: [] as any[] },
    ids.length ? db.from('bookings').select('id,property_id,guest_name,check_in,check_out,total_amount,status,platform').in('property_id', ids).order('check_in', { ascending: false }).limit(200) : { data: [] as any[] },
    ids.length ? db.from('maintenance_tickets').select('id,property_id,title,description,priority,status,created_at,resolved_at,resolution_notes,source').in('property_id', ids).order('created_at', { ascending: false }).limit(100) : { data: [] as any[] },
    db.from('invoice_settings').select('company_name').eq('business_id', rec.user_id).maybeSingle(),
  ])
  const live = (bookings.data ?? []).filter((b: any) => !['cancelled', 'canceled'].includes(String(b.status || '').toLowerCase()))
  const gross = live.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0)
  // what the arrangement means in money, when it is a plain percentage; any other model is as per their agreement
  const pct = rec.payment_model === 'commission' || rec.payment_model === 'percentage' ? Number(rec.payment_value) || 0 : null
  return NextResponse.json({
    preview, company: settings.data?.company_name || 'NOVOURQ',
    cohost: { id: rec.id, name: rec.name, email: rec.email, phone: rec.phone, currency: rec.currency || 'JMD', payment_model: rec.payment_model, payment_value: rec.payment_value, payment_note: rec.payment_note, agreement_start: rec.agreement_start, agreement_end: rec.agreement_end },
    properties: props.data ?? [], bookings: bookings.data ?? [], maintenance: tickets.data ?? [],
    totals: { gross, bookings: live.length, our_share: pct != null ? Math.round(gross * pct) / 100 : null, your_share: pct != null ? Math.round(gross * (100 - pct)) / 100 : null },
  })
}
