// When a Landlord Lead is marked Signed, make sure it also has one Client Properties row (stage Signed), linked by lead_id.
// That keeps Road to 100 and the KPI Tracker from counting the same property once as a lead and again as a client property.
import { serviceClient as db } from '@/lib/admin-auth'

export async function ensureClientProperty(businessId: string, lead: any, by: string): Promise<void> {
  const { data: ex } = await db.from('client_properties').select('id,stage').eq('business_id', businessId).eq('lead_id', lead.id).maybeSingle()
  const now = new Date().toISOString()
  const note = { at: now, by, kind: 'stage', text: 'Signed (from Landlord Leads)' }
  if (ex) {
    if (ex.stage !== 'signed') await db.from('client_properties').update({ stage: 'signed', signed_at: now, updated_at: now }).eq('id', ex.id)
    return
  }
  const address = [lead.location, lead.country].filter(Boolean).join(', ').trim() || 'Address to confirm'
  await db.from('client_properties').insert({
    business_id: businessId, lead_id: lead.id, created_by: by, address: address.slice(0, 200), country: lead.country || 'Jamaica',
    bedrooms: lead.bedrooms ?? null, bathrooms: lead.bathrooms ?? null,
    owner_name: lead.name || 'Owner', owner_email: lead.email || null, owner_phone: lead.phone || null,
    crm_contact_id: lead.crm_contact_id || null, stage: 'signed', signed_at: now,
    activity: [{ at: now, by, kind: 'created', text: 'Added automatically when the Landlord Lead was marked Signed' }, note],
  })
}
