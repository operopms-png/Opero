// A person who messages the company from a number we don't know is added to the CRM as a contact, once, with a note.
// Used by WhatsApp. (Phone calls do the same in voice-receptionist.) Never throws: the CRM entry is an extra.
import { serviceClient as db } from '@/lib/admin-auth'

export async function ensureCrmContact(businessId: string, phone: string, name: string | null, source: string, note: string): Promise<string | null> {
  try {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) return null
    const tail = digits.slice(-7)
    const { data: all } = await db.from('crm_contacts').select('id,phone').eq('user_id', businessId).not('phone', 'is', null).limit(5000)
    const hit = (all ?? []).find(x => String(x.phone).replace(/\D/g, '').endsWith(tail))
    if (hit) return hit.id as string
    const { data: ins } = await db.from('crm_contacts').insert({ user_id: businessId, name: name || `${source.split(' ')[0]} ${phone}`, phone, type: 'contact', source, status: 'prospect', notes: note.slice(0, 500) }).select('id').single()
    if (ins?.id) await db.from('crm_activities').insert({ user_id: businessId, contact_id: ins.id, type: 'message', subject: `First message (${source})`, body: note.slice(0, 1000), content: note.slice(0, 1000), logged_by: 'Novourq Cloud AI' })
    return (ins?.id as string) ?? null
  } catch { return null }
}
