import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { runEstimate } from '@/lib/earnings-estimate'

// Landlord Leads (Staff Centre) — landlords who used the earnings checker.
//   GET                                   -> all leads, newest first
//   POST {action:'update', id, status?, staff_notes?, assigned_to?}
//   POST {action:'rerun', id}             -> run the market estimate again

export const maxDuration = 60
const STATUSES = ['new', 'contacted', 'valuation', 'meeting', 'signed', 'lost']
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const { data, error } = await serviceClient.from('landlord_estimates').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(500)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const { data: lead } = await serviceClient.from('landlord_estimates').select('*').eq('id', String(b.id || '')).eq('business_id', c.businessId).maybeSingle()
  if (!lead) return bad('Lead not found', 404)

  if (b.action === 'update') {
    const patch: any = { updated_at: new Date().toISOString() }
    if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return bad('Unknown status'); patch.status = b.status }
    if (b.staff_notes !== undefined) patch.staff_notes = String(b.staff_notes).slice(0, 4000)
    if (b.assigned_to !== undefined) patch.assigned_to = String(b.assigned_to).slice(0, 120) || null
    const { data, error } = await serviceClient.from('landlord_estimates').update(patch).eq('id', lead.id).select('*').single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ lead: data })
  }

  if (b.action === 'rerun') {
    const estimate = await runEstimate({ location: lead.location, country: lead.country, propertyType: lead.property_type, bedrooms: lead.bedrooms, bathrooms: lead.bathrooms, furnished: lead.furnished, currency: lead.currency })
    const ok = estimate.short_let?.monthly_typical || estimate.long_let?.monthly_typical
    const { data } = await serviceClient.from('landlord_estimates').update(ok ? { estimate, estimate_error: null, updated_at: new Date().toISOString() } : { estimate_error: 'No market data came back', updated_at: new Date().toISOString() }).eq('id', lead.id).select('*').single()
    if (!ok) return bad('The market search came back empty — try again in a minute.', 502)
    return NextResponse.json({ lead: data })
  }

  return bad('Unknown action')
}
