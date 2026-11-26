// Keeps a Client Properties row and its CRM owner contact and deal in step. Used by Staff Centre → Client Properties and when a Landlord Lead is marked Signed.
import { serviceClient } from '@/lib/admin-auth'

export const SERVICE_LABEL: Record<string, string> = { sell: 'Sell', guaranteed_rent: 'Guaranteed rent', partnership: 'Partnership management', airbnb: 'Airbnb management', long_let: 'Long let', unsure: 'Not sure yet' }
// crm_deals.stage → CRM board status (see crm_deal_status_label in the DB)
export const CRM_STAGE: Record<string, string> = { new: '', viewing: '', numbers: '', offer: 'offer', signed: 'won', passed: 'lost' }
export const CRM_MODULE: Record<string, string> = { sell: 'estate', airbnb: 'str' }

export async function syncCrm(p: any) {
  const name = `${p.address}${p.subarea ? ', ' + p.subarea : ''}${p.service ? ' · ' + SERVICE_LABEL[p.service] : ''}`.slice(0, 200)
  let contactId = p.crm_contact_id
  if (!contactId) {
    if (p.owner_email) {
      const { data: ex } = await serviceClient.from('crm_contacts').select('id').eq('user_id', p.business_id).ilike('email', p.owner_email).limit(1)
      contactId = ex?.[0]?.id ?? null
    }
    if (!contactId) {
      const { data } = await serviceClient.from('crm_contacts').insert({ user_id: p.business_id, name: p.owner_name, email: p.owner_email || null, phone: p.owner_phone || null, source: p.referred_by ? `Client property · ${p.referred_by}` : 'Client property', module: CRM_MODULE[p.service] || 'pm', type: 'Owner', status: 'prospect', notes: `Owner of ${p.address}` }).select('id').single()
      contactId = data?.id ?? null
    }
  }
  let dealId = p.crm_deal_id
  const deal = { name, contact_id: contactId, stage: CRM_STAGE[p.stage] ?? '', value: p.price ?? null, module: CRM_MODULE[p.service] || 'pm' }
  if (dealId) await serviceClient.from('crm_deals').update(deal).eq('id', dealId)
  else { const { data } = await serviceClient.from('crm_deals').insert({ user_id: p.business_id, ...deal }).select('id').single(); dealId = data?.id ?? null }
  if (contactId !== p.crm_contact_id || dealId !== p.crm_deal_id) {
    const { data } = await serviceClient.from('client_properties').update({ crm_contact_id: contactId, crm_deal_id: dealId }).eq('id', p.id).select('*').single()
    return data ?? p
  }
  return p
}

