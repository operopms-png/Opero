import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/admin-auth'
import { curOf } from '@/lib/currency'

// A deal reaches Completed: create the property in Real Estate Intelligence (once) and link it to the deal.
export async function POST(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { dealId } = await req.json().catch(() => ({}))
  if (!dealId) return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  const { data: deal } = await serviceClient.from('investment_deals').select('*').eq('id', dealId).eq('user_id', uid).maybeSingle()
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.property_id) {
    await serviceClient.from('investment_deals').update({ stage: 'Completed', stage_updated_at: new Date().toISOString() }).eq('id', dealId)
    return NextResponse.json({ success: true, propertyId: deal.property_id, existing: true })
  }
  const f = deal.data?.form ?? deal.data ?? {}
  const address = String(deal.address || f.address || '').trim()
  const name = address.split(',')[0].trim() || 'New property'
  const income = Number(deal.data?.monthlyRent ?? f.monthlyRent ?? f.rent ?? 0)
  const { data: prop, error } = await serviceClient.from('pm_properties').insert({
    user_id: uid, name, address: address || null, status: 'Active', currency: curOf(f),
    monthly_income: Number.isFinite(income) && income > 0 ? income : null,
    bedrooms: f.bedrooms != null && f.bedrooms !== '' ? String(f.bedrooms) : null,
    bathrooms: f.bathrooms != null && f.bathrooms !== '' ? String(f.bathrooms) : null,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await serviceClient.from('investment_deals').update({ stage: 'Completed', property_id: prop.id, stage_updated_at: new Date().toISOString() }).eq('id', dealId)
  return NextResponse.json({ success: true, propertyId: prop.id })
}
