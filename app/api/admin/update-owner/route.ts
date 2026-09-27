import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'
import { staffLabel } from '@/lib/partner-activation'

export async function PATCH(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json()
  const { owner_id } = body
  if (!owner_id) return NextResponse.json({ error: 'owner_id is required' }, { status: 400 })

  // Only owners (clients) of the signed-in staff member's own business
  const { data: owner } = await serviceClient.from('owner_profiles').select('id').eq('id', owner_id).eq('business_id', staff.businessId).maybeSingle()
  if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })

  // Partial update: only touch fields actually sent, so e.g. editing just
  // 'invested' from a list view doesn't wipe out name/email/etc.
  const patch: Record<string, any> = {}
  if ('name' in body) patch.name = body.name
  if ('email' in body) patch.email = body.email
  if ('phone' in body) patch.phone = body.phone
  if ('invested' in body) patch.invested = Number(body.invested) || 0
  if ('split_percentage' in body) patch.split_percentage = Number(body.split_percentage) || 0
  if ('property_ids' in body) {
    // Keep only this business's properties, and keep "one client per property"
    // the same everywhere (Owner Portal, Customer Onboarding): a property given
    // to this owner is removed from any other owner in the business.
    const wanted: string[] = Array.isArray(body.property_ids) ? body.property_ids.map(String) : []
    const { data: ownProps } = wanted.length
      ? await serviceClient.from('properties').select('id').eq('user_id', staff.businessId).in('id', wanted)
      : { data: [] as { id: string }[] }
    const valid = (ownProps ?? []).map(p => p.id)
    patch.property_ids = valid
    if (valid.length) {
      const { data: others } = await serviceClient.from('owner_profiles').select('id, property_ids').eq('business_id', staff.businessId).neq('id', owner_id)
      for (const o of others ?? []) {
        const cur: string[] = o.property_ids ?? []
        if (cur.some(id => valid.includes(id))) {
          await serviceClient.from('owner_profiles').update({ property_ids: cur.filter(id => !valid.includes(id)) }).eq('id', o.id)
        }
      }
    }
  }
  // Staff marking the Partners portal fee as paid (e.g. bank transfer) or waiving/undoing it
  if ('partner_paid' in body) {
    patch.partner_paid_at = body.partner_paid ? new Date().toISOString() : null
    patch.partner_payment_ref = body.partner_paid ? (body.partner_payment_ref || 'Marked paid by staff') : null
    // Audit trail: who marked it paid (or undid it) and when
    patch.partner_confirmed_by = body.partner_paid ? await staffLabel(staff.staffId, null) : null
    patch.partner_confirmed_at = body.partner_paid ? new Date().toISOString() : null
  }

  const { error } = await serviceClient.from('owner_profiles').update(patch).eq('id', owner_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
