import { serviceClient } from '@/lib/admin-auth'

// Links a property to one owner (client) within a business, or unlinks it (ownerId null).
// A property belongs to at most one owner: it is removed from every other owner
// of the same business. Owners and properties of other businesses are never touched.
export async function assignProperty(businessId: string, propertyId: string, ownerId: string | null): Promise<string | null> {
  const { data: property } = await serviceClient.from('properties').select('id').eq('id', propertyId).eq('user_id', businessId).maybeSingle()
  if (!property) return 'Property not found'

  const { data: owners, error } = await serviceClient.from('owner_profiles').select('id, property_ids').eq('business_id', businessId)
  if (error) return error.message
  if (ownerId && !(owners ?? []).some(o => o.id === ownerId)) return 'Client not found'

  for (const owner of owners ?? []) {
    const current: string[] = owner.property_ids ?? []
    const hasIt = current.includes(propertyId)
    const shouldHaveIt = owner.id === ownerId
    if (hasIt && !shouldHaveIt) {
      const { error: e } = await serviceClient.from('owner_profiles').update({ property_ids: current.filter(id => id !== propertyId) }).eq('id', owner.id)
      if (e) return e.message
    } else if (!hasIt && shouldHaveIt) {
      const { error: e } = await serviceClient.from('owner_profiles').update({ property_ids: [...current, propertyId] }).eq('id', owner.id)
      if (e) return e.message
    }
  }
  return null
}
