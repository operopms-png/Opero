// Tuya cloud API client (Smart Life / Tuya cameras and locks).
// Signing per Tuya's "Sign Requests for Cloud Authorization":
//   stringToSign = METHOD \n sha256(body) \n <signed headers> \n url(path + sorted query)
//   token call:    sign = HMAC-SHA256(client_id + t + nonce + stringToSign, secret).toUpperCase()
//   business call: sign = HMAC-SHA256(client_id + access_token + t + nonce + stringToSign, secret).toUpperCase()
import crypto from 'crypto'

export const TUYA_REGIONS: Record<string, { label: string; host: string }> = {
  us: { label: 'Western America', host: 'https://openapi.tuyaus.com' },
  ue: { label: 'Eastern America', host: 'https://openapi-ueaz.tuyaus.com' },
  eu: { label: 'Central Europe', host: 'https://openapi.tuyaeu.com' },
  we: { label: 'Western Europe', host: 'https://openapi-weaz.tuyaeu.com' },
  in: { label: 'India', host: 'https://openapi.tuyain.com' },
  cn: { label: 'China', host: 'https://openapi.tuyacn.com' },
}

export type TuyaCreds = { region: string; accessId: string; secret: string }

const sha256 = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
const hmac = (s: string, key: string) => crypto.createHmac('sha256', key).update(s, 'utf8').digest('hex').toUpperCase()

export function tuyaStringToSign(method: string, path: string, body = '', signedHeaders: Record<string, string> = {}) {
  const [p, qs = ''] = path.split('?')
  const query = qs ? qs.split('&').filter(Boolean).sort().join('&') : ''
  // each signed header is "key:value\n" (verified against Tuya's worked example)
  const headerLines = Object.entries(signedHeaders).map(([k, v]) => `${k}:${v}\n`).join('')
  return `${method.toUpperCase()}\n${sha256(body)}\n${headerLines}\n${p}${query ? `?${query}` : ''}`
}

export function tuyaSign(o: { clientId: string; secret: string; t: string; nonce: string; accessToken?: string; stringToSign: string }) {
  return hmac(o.clientId + (o.accessToken ?? '') + o.t + o.nonce + o.stringToSign, o.secret)
}

const tokens = new Map<string, { token: string; until: number }>()

async function raw(c: TuyaCreds, method: string, path: string, json?: any, accessToken?: string) {
  const host = (TUYA_REGIONS[c.region] ?? TUYA_REGIONS.us).host
  const body = json === undefined ? '' : JSON.stringify(json)
  const t = String(Date.now())
  const nonce = crypto.randomUUID()
  const sign = tuyaSign({ clientId: c.accessId, secret: c.secret, t, nonce, accessToken, stringToSign: tuyaStringToSign(method, path, body) })
  const res = await fetch(host + path, {
    method,
    headers: { client_id: c.accessId, sign, t, nonce, sign_method: 'HMAC-SHA256', ...(accessToken ? { access_token: accessToken } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body || undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!data.success) throw new Error(data.msg ? `Tuya: ${data.msg}${data.code ? ` (${data.code})` : ''}` : `Tuya returned ${res.status}`)
  return data.result
}

async function token(c: TuyaCreds) {
  const key = c.region + c.accessId
  const hit = tokens.get(key)
  if (hit && hit.until > Date.now() + 60_000) return hit.token
  const r = await raw(c, 'GET', '/v1.0/token?grant_type=1')
  tokens.set(key, { token: r.access_token, until: Date.now() + (Number(r.expire_time) || 7200) * 1000 })
  return r.access_token as string
}

export async function tuya(c: TuyaCreds, method: string, path: string, json?: any) {
  return raw(c, method, path, json, await token(c))
}

// Cameras are category "sp"; door locks use several lock categories.
const LOCK_CATS = ['ms', 'jtmspro', 'jtmsbh', 'videolock', 'wf_jtmspro', 'mk', 'bxx', 'gyms', 'jtmsbx', 'hotelms', 'ble_ms']
export const kindForCategory = (cat?: string) => cat === 'sp' || cat === 'dghsxj' || cat === 'sp_wnq' ? 'camera' : LOCK_CATS.includes(cat ?? '') ? 'lock' : null

// Every device on the Smart Life / Tuya app accounts linked to the cloud project.
export async function tuyaDevices(c: TuyaCreds): Promise<any[]> {
  const out: any[] = []
  let lastId = ''
  for (let page = 0; page < 20; page++) {
    const r = await tuya(c, 'GET', `/v1.0/iot-01/associated-users/devices?size=100${lastId ? `&last_row_key=${encodeURIComponent(lastId)}` : ''}`)
    const list = r?.devices ?? []
    out.push(...list)
    if (!r?.has_more || !list.length) break
    lastId = r.last_row_key
  }
  return out
}

export async function tuyaStatus(c: TuyaCreds, deviceId: string): Promise<Record<string, any>> {
  const r = await tuya(c, 'GET', `/v1.0/devices/${encodeURIComponent(deviceId)}/status`)
  return Object.fromEntries((r ?? []).map((s: any) => [s.code, s.value]))
}

// Short-lived live stream URL for a Tuya camera (HLS plays in the browser).
export async function tuyaStream(c: TuyaCreds, deviceId: string): Promise<string> {
  const r = await tuya(c, 'POST', `/v1.0/devices/${encodeURIComponent(deviceId)}/stream/actions/allocate`, { type: 'hls' })
  if (!r?.url) throw new Error('Tuya did not return a stream for this camera')
  return r.url
}

// Battery % and lock state from a lock's status codes (names vary by model).
export function lockInfo(st: Record<string, any>) {
  const battery = st.residual_electricity ?? st.battery_percentage ?? st.battery_state_value ?? (st.battery_state === 'high' ? 90 : st.battery_state === 'middle' ? 50 : st.battery_state === 'low' ? 15 : undefined)
  const lockedRaw = st.lock_motor_state ?? st.closed_opened ?? st.lock_state
  const locked = typeof lockedRaw === 'boolean' ? lockedRaw : lockedRaw === 'closed' ? true : lockedRaw === 'open' ? false : undefined
  return { battery: battery == null ? null : Number(battery), locked: locked == null ? null : !!locked }
}
