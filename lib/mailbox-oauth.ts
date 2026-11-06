// "Sign in with Google / Microsoft" for mailboxes. Server-only.
// A person signs in on Google or Microsoft's own page and approves access to their mail. We keep only a
// refresh token (encrypted, in the same column as a password would be) and trade it for short-lived access
// tokens when reading or sending mail over IMAP/SMTP. We never see their password.
//
// Switched on per platform by setting these in Netlify (each provider needs an app registered for Novourq):
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET       redirect URI: <site>/api/oauth/mailbox/callback
//   MICROSOFT_OAUTH_CLIENT_ID / MICROSOFT_OAUTH_CLIENT_SECRET redirect URI: <site>/api/oauth/mailbox/callback
import crypto from 'crypto'
import { SITE_URL } from '@/lib/brand'

export type OAuthProvider = 'google' | 'microsoft'

type Cfg = { label: string; auth: string; token: string; scope: string; id?: string; secret?: string; imap: [string, number]; smtp: [string, number] }
function cfg(p: OAuthProvider): Cfg {
  if (p === 'google') return {
    label: 'Google', auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email https://mail.google.com/', id: process.env.GOOGLE_OAUTH_CLIENT_ID, secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    imap: ['imap.gmail.com', 993], smtp: ['smtp.gmail.com', 465],
  }
  return {
    label: 'Microsoft', auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid email offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
    id: process.env.MICROSOFT_OAUTH_CLIENT_ID, secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
    imap: ['outlook.office365.com', 993], smtp: ['smtp.office365.com', 587],
  }
}
export const oauthHosts = (p: OAuthProvider) => ({ imap: cfg(p).imap, smtp: cfg(p).smtp })
export const oauthLabel = (p: OAuthProvider) => cfg(p).label
export const oauthStatus = () => ({ google: !!(cfg('google').id && cfg('google').secret), microsoft: !!(cfg('microsoft').id && cfg('microsoft').secret) })
export const redirectUri = () => `${SITE_URL}/api/oauth/mailbox/callback`

// ---- signed state (so the callback knows which company and person started this) ----
function skey() {
  const base = process.env.MAILBOX_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!base) throw new Error('Mailbox encryption key is not configured')
  return crypto.createHash('sha256').update('opero-oauth-state:' + base).digest()
}
export type OAuthState = { biz: string; uid: string; provider: OAuthProvider; kind: 'shared' | 'staff'; name?: string; mid?: string; exp: number }
export function signState(s: Omit<OAuthState, 'exp'>) {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + 10 * 60_000, n: crypto.randomBytes(8).toString('hex') })).toString('base64url')
  return body + '.' + crypto.createHmac('sha256', skey()).update(body).digest('base64url')
}
export function verifyState(t: string): OAuthState | null {
  const [body, sig] = String(t || '').split('.')
  if (!body || !sig) return null
  const good = crypto.createHmac('sha256', skey()).update(body).digest('base64url')
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null
  try { const s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); return s.exp > Date.now() ? s : null } catch { return null }
}

export function authUrl(p: OAuthProvider, state: string, loginHint?: string) {
  const c = cfg(p)
  if (!c.id || !c.secret) throw new Error(`${c.label} sign-in is not switched on yet`)
  const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri(), response_type: 'code', scope: c.scope, state })
  if (p === 'google') { q.set('access_type', 'offline'); q.set('prompt', 'consent') } else { q.set('prompt', 'select_account') }
  if (loginHint) q.set('login_hint', loginHint)
  return `${c.auth}?${q}`
}

async function tokenCall(p: OAuthProvider, params: Record<string, string>) {
  const c = cfg(p)
  const r = await fetch(c.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: c.id!, client_secret: c.secret!, ...params }) })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error === 'invalid_grant' ? 'invalid_grant' : (j.error_description || j.error || 'Sign-in failed'))
  return j
}

export async function exchangeCode(p: OAuthProvider, code: string) {
  const j = await tokenCall(p, { grant_type: 'authorization_code', code, redirect_uri: redirectUri() })
  let email = ''
  try { const pl = JSON.parse(Buffer.from(String(j.id_token).split('.')[1], 'base64url').toString('utf8')); email = String(pl.email || pl.preferred_username || '').toLowerCase() } catch {}
  return { refresh: j.refresh_token as string | undefined, access: j.access_token as string, expiresIn: Number(j.expires_in) || 3000, email }
}

const cache = new Map<string, { token: string; exp: number }>()
export async function accessTokenFromRefresh(p: OAuthProvider, refresh: string) {
  const k = p + ':' + crypto.createHash('sha256').update(refresh).digest('hex').slice(0, 24)
  const hit = cache.get(k)
  if (hit && hit.exp > Date.now() + 60_000) return hit.token
  const j = await tokenCall(p, { grant_type: 'refresh_token', refresh_token: refresh, scope: cfg(p).scope })
  cache.set(k, { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 })
  return j.access_token as string
}
