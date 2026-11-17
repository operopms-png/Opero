export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceClient as db } from '@/lib/admin-auth'
import { seal } from '@/lib/secret-store'

// Saves a company's Smoobu API key or secret encrypted. The browser sends it here instead of writing it to the table directly.
//   POST {column:'smoobu_api_key'|'smoobu_api_secret', value}
export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const column = b.column
  if (column !== 'smoobu_api_key' && column !== 'smoobu_api_secret') return NextResponse.json({ error: 'Unknown key.' }, { status: 400 })
  const value = String(b.value || '').trim(); if (!value) return NextResponse.json({ error: 'Enter the key.' }, { status: 400 })
  const { data: cur } = await db.from('integrations').select('smoobu_webhook_token').eq('user_id', c.businessId).maybeSingle()
  const extra = column === 'smoobu_api_key' && !cur?.smoobu_webhook_token ? { smoobu_webhook_token: crypto.randomUUID().replace(/-/g, '') } : {}
  const { error } = await db.from('integrations').upsert({ user_id: c.businessId, [column]: seal(value), ...extra }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...extra })
}
