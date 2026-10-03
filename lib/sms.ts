// Texts (SMS) helpers shared by /api/sms/*.
import crypto from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'

// Turn what staff type into an international number Twilio accepts.
//   +44 7700 900123 / 07700900123  -> +447700900123 (UK mobile)
//   876 555 0142 / 1-876-555-0142  -> +18765550142  (Jamaica / North America)
// Anything else must start with + and a country code.
export function normalizePhone(raw: string): string | null {
  const s = String(raw || '').trim()
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return null
  if (s.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null
  if (s.startsWith('00')) return digits.length >= 10 ? '+' + digits.slice(2) : null
  if (/^07\d{9}$/.test(digits)) return '+44' + digits.slice(1)
  if (/^44\d{10}$/.test(digits)) return '+' + digits
  if (/^1\d{10}$/.test(digits)) return '+' + digits
  if (/^\d{10}$/.test(digits)) return '+1' + digits // 876… and other +1 numbers
  return null
}
const last9 = (p: string) => String(p || '').replace(/[^\d]/g, '').slice(-9)

// The business's texting number. Created on first use from TWILIO_SMS_FROM.
export async function smsConnection(businessId: string) {
  const { data } = await db.from('sms_connections').select('*').eq('business_id', businessId).order('created_at').limit(1)
  if (data?.[0]) return data[0]
  const from = normalizePhone(process.env.TWILIO_SMS_FROM || '')
  if (!from || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null
  const { data: made } = await db.from('sms_connections').upsert({ business_id: businessId, label: 'Texts', phone: from }, { onConflict: 'phone' }).select('*').single()
  return made
}

// Who is this number? Looks through CRM contacts, tenants, landlords, guests,
// client-property owners and partners for a matching phone.
export async function nameForPhone(businessId: string, phone: string): Promise<{ name: string | null; contactId: string | null }> {
  const tail = last9(phone)
  if (tail.length < 7) return { name: null, contactId: null }
  const like = `%${tail.slice(-7)}`
  const sources: [string, string, string, string][] = [
    ['crm_contacts', 'user_id', 'phone', 'name'], ['pm_tenants', 'user_id', 'phone', 'name'], ['estate_tenants', 'user_id', 'phone', 'name'],
    ['pm_landlords', 'user_id', 'phone', 'name'], ['client_properties', 'business_id', 'owner_phone', 'owner_name'], ['partner_signups', 'business_id', 'phone', 'name'],
  ]
  for (const [table, bizCol, phoneCol, nameCol] of sources) {
    const { data } = await db.from(table).select(`id,${phoneCol},${nameCol}`).eq(bizCol, businessId).ilike(phoneCol, like).limit(5)
    const hit = (data || []).find((r: any) => last9(r[phoneCol]) === tail)
    if (hit) return { name: (hit as any)[nameCol] || null, contactId: table === 'crm_contacts' ? (hit as any).id : null }
  }
  return { name: null, contactId: null }
}

// Twilio signs every webhook: HMAC-SHA1 of the full URL + sorted POST params.
export function twilioSignatureOk(url: string, params: Record<string, string>, signature: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token || !signature) return false
  const data = url + Object.keys(params).sort().map(k => k + params[k]).join('')
  const expected = crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64')
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) } catch { return false }
}
