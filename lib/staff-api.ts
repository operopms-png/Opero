'use client'
// Small fetch helper for Staff Centre pages: adds the signed-in user's token
// and turns error responses into thrown Errors with the server's message.
import { supabase } from '@/lib/supabase'

export async function staffApi<T = any>(path: string, body?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || (d as any).error) throw new Error((d as any).error || 'Something went wrong')
  return d as T
}

export const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
export const money = (n: any, cur = 'GBP', short = false) => {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return '—'
  const v = Number(n), s = SYM[cur] ?? ''
  if (short && Math.abs(v) >= 1e6) return (v < 0 ? '-' : '') + s + (Math.abs(v) / 1e6).toFixed(1) + 'm'
  if (short && Math.abs(v) >= 1e4) return (v < 0 ? '-' : '') + s + Math.round(Math.abs(v) / 1e3) + 'k'
  return (v < 0 ? '-' : '') + s + Math.round(Math.abs(v)).toLocaleString('en-GB')
}
export const MODULE_LABEL: Record<string, string> = { vr: 'Vacation Rentals', pm: 'Property Management', ea: 'Estate Agency', dev: 'Developments', company: 'Company' }
export const MODULE_COL: Record<string, string> = { vr: '#B08A2E', pm: '#2F6DB5', ea: '#138a62', dev: '#7A4FB0', company: '#8A877F' }
