import { serviceClient as db } from '@/lib/admin-auth'

// The company's own currency symbol (Settings → Currency), for server-built emails and records. Defaults to the pound.
export async function companySymbol(businessId: string): Promise<string> {
  const { data } = await db.from('invoice_settings').select('currency_symbol').eq('business_id', businessId).maybeSingle()
  return data?.currency_symbol || '£'
}
