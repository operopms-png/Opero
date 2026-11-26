// A Landlord Lead and its Client Properties row stay in step:
//  - marked Signed  -> one Client Properties row, stage Signed, linked by lead_id (and a CRM owner contact and deal through syncCrm);
//  - moved back out of Signed -> that row goes back to New, so it stops counting towards Road to 100.
// That keeps Road to 100 and the KPI Tracker from counting the same property once as a lead and again as a client property.
import { serviceClient as db } from '@/lib/admin-auth'
import { syncCrm } from '@/lib/client-property-crm'

export async function ensureClientProperty(businessId: string, lead: any, by: string): Promise<void> {
  const { data: ex } = await db.from('client_properties').select('*').eq('business_id', businessId).eq('lead_id', lead.id).maybeSingle()
  const now = new Date().toISOString()
  const log = (text: string, kind = 'stage') => ({ at: now, by, kind, text })
  if (ex) {
    if (ex.stage !== 'signed') {
      const { data } = await db.from('client_properties').update({ stage: 'signed', signed_at: now, updated_at: now, activity: [log('Signed (from Landlord Leads)'), ...(ex.activity || [])].slice(0, 300) }).eq('id', ex.id).select('*').single()
      if (data) await syncCrm(data).catch(() => {})
    }
    return
  }
  const address = [lead.location, lead.country].filter(Boolean).join(', ').trim() || 'Address to confirm'
  const { data } = await db.from('client_properties').insert({
    business_id: businessId, lead_id: lead.id, created_by: by, address: address.slice(0, 200), country: lead.country || 'Jamaica',
    bedrooms: lead.bedrooms ?? null, bathrooms: lead.bathrooms ?? null,
    owner_name: lead.name || 'Owner', owner_email: lead.email || null, owner_phone: lead.phone || null,
    crm_contact_id: lead.crm_contact_id || null, stage: 'signed', signed_at: now,
    activity: [log('Added automatically when the Landlord Lead was marked Signed', 'created'), log('Signed (from Landlord Leads)')],
  }).select('*').single()
  if (data) await syncCrm(data).catch(() => {})
}

export async function revertClientProperty(businessId: string, lead: any, by: string): Promise<void> {
  const { data: ex } = await db.from('client_properties').select('*').eq('business_id', businessId).eq('lead_id', lead.id).maybeSingle()
  if (!ex || ex.stage !== 'signed') return
  const now = new Date().toISOString()
  const { data } = await db.from('client_properties').update({ stage: 'new', signed_at: null, updated_at: now, activity: [{ at: now, by, kind: 'stage', text: `Back to New: the Landlord Lead was moved out of Signed (now ${lead.status})` }, ...(ex.activity || [])].slice(0, 300) }).eq('id', ex.id).select('*').single()
  if (data) await syncCrm(data).catch(() => {})
}
