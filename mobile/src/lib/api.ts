import { supabase } from './supabase'
import { API_URL } from './config'

export type Role = 'guest' | 'tenant' | 'owner' | 'partner' | 'staff'
export const ROLE_LABEL: Record<Role, string> = { guest: 'Guest', tenant: 'Tenant', owner: 'Property owner', partner: 'Partner', staff: 'Staff' }

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const t = data.session?.access_token
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_URL + path, { ...init, headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...(init.headers as any) } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
  return body as T
}

export const api = {
  home: (role?: Role) => call(`/api/app${role ? `?role=${role}` : ''}`),
  post: (body: any) => call('/api/app', { method: 'POST', body: JSON.stringify(body) }),
  sendCode: (email: string) => call('/api/app/otp', { method: 'POST', body: JSON.stringify({ action: 'send', email }) }),
  verifyCode: (email: string, code: string) => call<{ token_hash: string }>('/api/app/otp', { method: 'POST', body: JSON.stringify({ action: 'verify', email, code }) }),
}
