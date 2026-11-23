// WhatsApp mirror helpers. The portal never talks to WhatsApp itself: it talks to the company's own bridge (a small service
// that holds the linked number, see whatsapp-bridge/). Each company has its own bridge row, so nothing is shared between companies.
import { serviceClient as db } from '@/lib/admin-auth'

export type Bridge = { business_id: string; bridge_url: string; secret: string }

export const canUseWhatsApp = (c: { isAdmin: boolean; role?: string }) => c.isAdmin || /co founder/i.test(c.role || '')

export async function getBridge(businessId: string): Promise<Bridge | null> {
  const { data } = await db.from('wa_bridges').select('business_id,bridge_url,secret').eq('business_id', businessId).maybeSingle()
  return (data as Bridge) ?? null
}

export async function bridgeCall(b: Bridge, path: string, body?: any, ms = 20000): Promise<{ ok: boolean; status: number; data: any }> {
  if (!b.bridge_url) return { ok: false, status: 0, data: { error: 'The bridge address has not been added yet.' } }
  try {
    const r = await fetch(b.bridge_url.replace(/\/+$/, '') + path, {
      method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b.secret}` },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(ms), cache: 'no-store',
    })
    const data = await r.json().catch(() => ({}))
    return { ok: r.ok, status: r.status, data }
  } catch { return { ok: false, status: 0, data: { error: 'Could not reach the WhatsApp bridge. Check it is running.' } } }
}

// Send one message through the company's bridge and keep a copy. `to` is a phone number with country code, or a chat id from a thread.
export async function sendWhatsApp(businessId: string, input: { to: string; text: string; by: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const b = await getBridge(businessId)
  if (!b) return { ok: false, error: 'WhatsApp is not set up yet. Open Staff Centre → Human Intelligence Hub → Clients and sales → WhatsApp.' }
  const text = input.text.trim().slice(0, 4000)
  if (!text) return { ok: false, error: 'Type a message first.' }
  const r = await bridgeCall(b, '/send', { to: input.to, text })
  if (!r.ok) return { ok: false, error: r.data?.error || 'Could not send the message.' }
  const jid: string = r.data?.jid || (input.to.includes('@') ? input.to : '')
  if (jid) {
    const digits = input.to.includes('@') ? '' : input.to.replace(/\D/g, '')
    await db.from('wa_messages').upsert({
      business_id: businessId, wa_id: r.data?.wa_id || null, jid, phone: digits || (jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : null),
      from_me: true, body: text, sent_by: input.by.slice(0, 120), at: new Date().toISOString(),
    }, { onConflict: 'business_id,wa_id' })
  }
  return { ok: true }
}

// Find a chat by a person's name or number from what has already been said in WhatsApp. Returns the chat id and a label.
export async function findChat(businessId: string, who: string): Promise<{ jid: string; label: string; phone: string | null } | null> {
  const q = who.trim().replace(/[%_,()]/g, ' ').slice(0, 80).trim()
  if (!q) return null
  const digits = q.replace(/\D/g, '')
  const filter = digits.length >= 7 ? `phone.ilike.%${digits}%` : `name.ilike.%${q}%`
  const { data } = await db.from('wa_messages').select('jid,name,phone,at').eq('business_id', businessId).or(filter).eq('from_me', false).order('at', { ascending: false }).limit(1)
  const m = data?.[0]
  return m ? { jid: m.jid, label: m.name || m.phone || m.jid.split('@')[0], phone: m.phone } : null
}
