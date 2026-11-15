import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { setAiPaused } from '@/lib/whatsapp-meta'

// POST { connection_id, contact_phone, ai_paused } -> Take over a chat (AI off) or Hand back to AI.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const { data: conn } = await db.from('whatsapp_connections').select('id,user_id').eq('id', String(b.connection_id || '')).eq('user_id', c.businessId).maybeSingle()
  if (!conn || !b.contact_phone) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  const paused = !!b.ai_paused
  await setAiPaused(conn, String(b.contact_phone), paused, c.name || c.email, paused ? 'Taken over by a team member' : undefined)
  return NextResponse.json({ ok: true, ai_paused: paused })
}
