// Server side of the house email format -- loads the business's saved
// format. Rendering helpers live in lib/email-format-shared.ts.
import { serviceClient } from '@/lib/admin-auth'
import { DEFAULT_FORMAT, FORMAT_FIELDS, type EmailFormat } from '@/lib/email-format-shared'
export * from '@/lib/email-format-shared'

export async function getFormat(businessId: string): Promise<EmailFormat> {
  const { data } = await serviceClient.from('email_format').select('*').eq('business_id', businessId).maybeSingle()
  const f: any = { ...DEFAULT_FORMAT }
  for (const k of FORMAT_FIELDS) if (data && data[k] !== null && data[k] !== undefined) f[k] = data[k]
  return f
}
