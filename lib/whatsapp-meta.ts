// WhatsApp Business through Meta's WhatsApp Cloud API (no Twilio). Server-only.
// Each company connects its own number (whatsapp_connections, provider 'meta').
// Needed in Netlify: META_APP_ID, META_APP_SECRET, WHATSAPP_VERIFY_TOKEN.
// Optional: NEXT_PUBLIC_META_APP_ID + NEXT_PUBLIC_META_CONFIG_ID for the one-click "Connect with Facebook" button.
import crypto from 'crypto'
import { serviceClient as db } from '@/lib/admin-auth'
import { decrypt } from '@/lib/mailbox'

const VERSION = process.env.META_GRAPH_VERSION || 'v21.0'
const GRAPH = `https://graph.facebook.com/${VERSION}`

export const WINDOW_MS = 24 * 60 * 60 * 1000 // Meta lets you send free text for 24 hours after the contact last wrote

export const metaConfigured = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN)

// Digits only, as Meta wants them (no +).
export const waDigits = (phone: string) => String(phone || '').replace(/[^\d]/g, '')

// Meta signs every webhook: X-Hub-Signature-256 = sha256=HMAC(app secret, raw body).
export function signatureOk(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET
  if (!secret || !header) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header)) } catch { return false }
}

async function graph(path: string, token: string, init: { method?: string; body?: any } = {}): Promise<{ ok: boolean; data: any; error?: string }> {
  try {
    const r = await fetch(`${GRAPH}${path}`, {
      method: init.method || 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data?.error) return { ok: false, data, error: data?.error?.error_user_msg || data?.error?.message || `Meta returned ${r.status}` }
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message || 'Could not reach Meta' }
  }
}

// ---------- connecting a number ----------
// One-click sign-up returns a short-lived code; swap it for an access token.
export async function exchangeCode(code: string): Promise<{ token?: string; error?: string }> {
  try {
    const u = `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(process.env.META_APP_ID || '')}&client_secret=${encodeURIComponent(process.env.META_APP_SECRET || '')}&code=${encodeURIComponent(code)}`
    const r = await fetch(u)
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.access_token) return { error: d?.error?.message || 'Meta did not accept that sign-in. Try again.' }
    return { token: d.access_token }
  } catch (e: any) { return { error: e?.message || 'Could not reach Meta' } }
}

export async function phoneInfo(phoneNumberId: string, token: string) {
  const r = await graph(`/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`, token)
  if (!r.ok) return { error: r.error }
  return { phone: waDigits(r.data.display_phone_number), verifiedName: r.data.verified_name as string | undefined, quality: r.data.quality_rating as string | undefined }
}

// Tell Meta to send this business's messages to our webhook.
export const subscribeApp = (wabaId: string, token: string) => graph(`/${encodeURIComponent(wabaId)}/subscribed_apps`, token, { method: 'POST', body: {} })

// ---------- sending ----------
export function tokenFor(conn: any): string | null {
  try { return conn?.access_token_enc ? decrypt(conn.access_token_enc) : null } catch { return null }
}

export async function sendText(conn: any, to: string, body: string): Promise<{ wamid?: string; error?: string }> {
  const token = tokenFor(conn)
  if (!token || !conn.phone_number_id) return { error: 'This WhatsApp number needs reconnecting in Settings → WhatsApp.' }
  const r = await graph(`/${conn.phone_number_id}/messages`, token, { method: 'POST', body: { messaging_product: 'whatsapp', recipient_type: 'individual', to: waDigits(to), type: 'text', text: { body, preview_url: false } } })
  if (!r.ok) return { error: r.error }
  return { wamid: r.data?.messages?.[0]?.id }
}

// Outside the 24-hour window only an approved template can start or restart a chat.
export async function sendTemplate(conn: any, to: string, name: string, language: string, params: string[] = []): Promise<{ wamid?: string; error?: string }> {
  const token = tokenFor(conn)
  if (!token || !conn.phone_number_id) return { error: 'This WhatsApp number needs reconnecting in Settings → WhatsApp.' }
  const template: any = { name, language: { code: language || 'en_GB' } }
  if (params.length) template.components = [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }]
  const r = await graph(`/${conn.phone_number_id}/messages`, token, { method: 'POST', body: { messaging_product: 'whatsapp', to: waDigits(to), type: 'template', template } })
  if (!r.ok) return { error: r.error }
  return { wamid: r.data?.messages?.[0]?.id }
}

export async function markRead(conn: any, wamid: string) {
  const token = tokenFor(conn)
  if (!token || !conn.phone_number_id) return
  await graph(`/${conn.phone_number_id}/messages`, token, { method: 'POST', body: { messaging_product: 'whatsapp', status: 'read', message_id: wamid } })
}

// ---------- the 24-hour window ----------
export async function lastContactAt(connectionId: string, phone: string): Promise<string | null> {
  const { data } = await db.from('whatsapp_messages').select('created_at').eq('connection_id', connectionId).eq('contact_phone', phone).eq('sender', 'contact').order('created_at', { ascending: false }).limit(1)
  return data?.[0]?.created_at ?? null
}
export const windowOpenFrom = (lastAt: string | null) => !!lastAt && Date.now() - new Date(lastAt).getTime() < WINDOW_MS
export async function windowOpen(connectionId: string, phone: string) { return windowOpenFrom(await lastContactAt(connectionId, phone)) }

// ---------- hand-over ----------
export async function setAiPaused(conn: { id: string; user_id: string }, phone: string, paused: boolean, by: string, reason?: string, draft?: string | null) {
  await db.from('whatsapp_threads').upsert({
    connection_id: conn.id, business_id: conn.user_id, contact_phone: phone, ai_paused: paused,
    paused_reason: paused ? (reason || null) : null, paused_by: paused ? by : null, paused_at: paused ? new Date().toISOString() : null,
    ai_draft: paused ? (draft ?? null) : null, updated_at: new Date().toISOString(),
  }, { onConflict: 'connection_id,contact_phone' })
}
export async function threadState(connectionId: string, phone: string) {
  const { data } = await db.from('whatsapp_threads').select('ai_paused,paused_reason,paused_by,paused_at,ai_draft').eq('connection_id', connectionId).eq('contact_phone', phone).maybeSingle()
  return data
}
