// Low-level Smoobu API client -- shared by lib/sync-smoobu.ts (the
// sync job) and lib/ai-guest-receptionist.ts (auto-reply), so neither
// has to import from the other and create a circular dependency.
//
// Auth: if an API secret is saved (integrations.smoobu_api_secret) every
// request is HMAC-signed (X-API-Key, X-Timestamp, X-Nonce, X-Signature) as
// Smoobu requires from 31 Oct 2026. Without a secret it falls back to the
// legacy Api-Key header, which Smoobu stops accepting after that date.
import crypto from 'crypto'

const SMOOBU_ORIGIN = 'https://login.smoobu.com'
export type SmoobuCreds = { apiKey: string; secret?: string | null }
const creds = (c: string | SmoobuCreds): SmoobuCreds => typeof c === 'string' ? { apiKey: c } : c

// RFC 3986 encoding (spaces as %20, brackets encoded), keys sorted.
const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase())

function headersFor(c: SmoobuCreds, method: string, pathWithQuery: string, body: string) {
  if (!c.secret) return { 'Api-Key': c.apiKey } as Record<string, string>
  const [path, qs = ''] = pathWithQuery.split('?')
  const query = qs ? Array.from(new URLSearchParams(qs).entries()).sort(([a, av], [b, bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)).map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join('&') : ''
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const nonce = crypto.randomUUID()
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex')
  const canonical = [method.toUpperCase(), '/api' + path, query, timestamp, nonce, bodyHash, c.apiKey].join('\n')
  const signature = crypto.createHmac('sha256', c.secret).update(canonical).digest('base64')
  return { 'X-API-Key': c.apiKey, 'X-Timestamp': timestamp, 'X-Nonce': nonce, 'X-Signature': signature } as Record<string, string>
}

async function call(c0: string | SmoobuCreds, method: string, path: string, json?: any) {
  const c = creds(c0)
  const body = json === undefined ? '' : JSON.stringify(json)
  const res = await fetch(`${SMOOBU_ORIGIN}/api${path}`, {
    method,
    headers: { ...headersFor(c, method, path, body), 'Cache-Control': 'no-cache', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: json === undefined ? undefined : body,
  })
  return res
}

export async function smoobuFetch(c: string | SmoobuCreds, path: string) {
  const res = await call(c, 'GET', path)
  if (!res.ok) throw new Error(`Smoobu ${path} returned ${res.status}`)
  return res.json()
}

export async function sendSmoobuGuestMessage(c: string | SmoobuCreds, smoobuReservationId: string, subject: string | undefined, body: string) {
  const payload = { subject: subject || undefined, messageBody: body }
  let res = await call(c, 'POST', `/reservations/${smoobuReservationId}/messages/send-message-to-guest`, payload)
  // Newer documented endpoint, in case the older path is retired
  if (res.status === 404 || res.status === 405) res = await call(c, 'POST', `/reservations/${smoobuReservationId}/messages`, payload)
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : `Smoobu send failed with ${res.status}`)
  }
  return true
}
