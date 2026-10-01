// Server side of Marketing → Scripts.
import { serviceClient } from '@/lib/admin-auth'
import type { Script } from '@/lib/scripts-shared'

export async function listScripts(businessId: string, where?: 'email' | 'airbnb'): Promise<Script[]> {
  let q = serviceClient.from('marketing_scripts').select('*').eq('business_id', businessId)
  if (where === 'email') q = q.eq('show_email', true)
  if (where === 'airbnb') q = q.eq('show_airbnb', true)
  const { data } = await q.order('category').order('sort').order('name')
  return (data ?? []) as Script[]
}
