import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller, encrypt, decrypt } from '@/lib/mailbox'

// Grok login passwords for AI staff. Admins only. Stored encrypted (AES-256-GCM),
// never returned in the normal AI staff list, and every set or reveal is logged.
//   POST { id, password }        set or change the password
//   GET  ?id=<ai_staff id>       reveal the password (logged)

async function adminFor(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  if (!c.isAdmin) return { error: NextResponse.json({ error: 'Only an admin can manage AI agent passwords.' }, { status: 403 }) }
  return { caller: c }
}

async function logAction(id: string, action: string, email: string) {
  await db.from('ai_staff_secret_log').insert({ ai_staff_id: id, action, actor_email: email })
}

export async function POST(req: NextRequest) {
  const a = await adminFor(req)
  if (a.error) return a.error
  const body = await req.json().catch(() => null)
  const id = String(body?.id ?? '')
  const password = String(body?.password ?? '')
  if (!id) return NextResponse.json({ error: 'Agent is needed.' }, { status: 400 })
  if (password.length < 8 || password.length > 200) return NextResponse.json({ error: 'Password must be 8 to 200 characters.' }, { status: 400 })

  const { error } = await db.from('ai_staff')
    .update({ grok_password_enc: encrypt(password), grok_password_set_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAction(id, 'set', a.caller!.email)
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const a = await adminFor(req)
  if (a.error) return a.error
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Agent is needed.' }, { status: 400 })

  const { data, error } = await db.from('ai_staff').select('grok_password_enc').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.grok_password_enc) return NextResponse.json({ password: null })
  await logAction(id, 'reveal', a.caller!.email)
  return NextResponse.json({ password: decrypt(data.grok_password_enc) })
}
