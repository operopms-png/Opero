import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'

// Email sign-in codes for the Sangsters mobile app.
//   POST {action:'send', email}            -> emails a 6-digit code (10 min)
//   POST {action:'verify', email, code}    -> {token_hash}; the app finishes
//        sign-in with supabase.auth.verifyOtp({ token_hash, type: 'email' })
// Anyone can sign in with their email; the app decides what they see from
// the records linked to that email (booking, tenancy, ownership, staff).

export const dynamic = 'force-dynamic'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: CORS })
const hash = (email: string, code: string) => crypto.createHash('sha256').update(`${email}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest('hex')

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 200)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Please enter a valid email address.')
  const ip = String(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '').slice(0, 60)

  if (b.action === 'send') {
    const since = new Date(Date.now() - 15 * 60e3).toISOString()
    const { count } = await serviceClient.from('app_otps').select('id', { count: 'exact', head: true }).ilike('email', email).gte('created_at', since)
    if ((count ?? 0) >= 5) return bad('Too many codes requested. Please wait a few minutes and try again.', 429)
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    await serviceClient.from('app_otps').insert({ email, code_hash: hash(email, code), expires_at: new Date(Date.now() + 10 * 60e3).toISOString(), ip: ip || null })
    await sendEmail(email, `${code} is your Sangsters sign-in code`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338;max-width:480px">
<p>Here is your sign-in code for the Sangsters app:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#191815;margin:18px 0">${code}</p>
<p style="color:#6b675e">It expires in 10 minutes. If you didn't ask for this, you can ignore this email.</p></div>`)
    return NextResponse.json({ ok: true }, { headers: CORS })
  }

  if (b.action === 'verify') {
    const code = String(b.code ?? '').replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) return bad('Please enter the 6-digit code.')
    const { data: rows } = await serviceClient.from('app_otps').select('*').ilike('email', email).is('used_at', null).gte('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1)
    const row = rows?.[0]
    if (!row) return bad('That code has expired. Please request a new one.')
    if (row.attempts >= 5) return bad('Too many attempts. Please request a new code.', 429)
    if (row.code_hash !== hash(email, code)) {
      await serviceClient.from('app_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id)
      return bad('That code is not right. Please check and try again.')
    }
    await serviceClient.from('app_otps').update({ used_at: new Date().toISOString() }).eq('id', row.id)

    // Create the login on first use, then hand back a one-time token the app exchanges for a session.
    let link = await serviceClient.auth.admin.generateLink({ type: 'magiclink', email })
    if (link.error) {
      const created = await serviceClient.auth.admin.createUser({ email, email_confirm: true })
      if (created.error) return bad('Could not sign you in. Please try again.', 500)
      link = await serviceClient.auth.admin.generateLink({ type: 'magiclink', email })
    }
    const token_hash = (link.data as any)?.properties?.hashed_token
    if (!token_hash) return bad('Could not sign you in. Please try again.', 500)
    return NextResponse.json({ ok: true, token_hash }, { headers: CORS })
  }

  return bad('Unknown action')
}
