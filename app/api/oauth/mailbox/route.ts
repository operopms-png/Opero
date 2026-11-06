import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { authUrl, oauthStatus, signState, type OAuthProvider } from '@/lib/mailbox-oauth'
import { serviceClient } from '@/lib/admin-auth'

// Sign in with Google / Microsoft to connect a mailbox (admins only).
//   GET  -> { google: bool, microsoft: bool }   which sign-ins are switched on for the platform
//   POST {provider, kind?, name?, mailbox_id?} -> { url }   send the browser to this address to sign in
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  return NextResponse.json(oauthStatus())
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Only admins can connect mailboxes', 403)
  const b = await req.json().catch(() => ({}))
  const provider = b.provider as OAuthProvider
  if (provider !== 'google' && provider !== 'microsoft') return bad('Choose Google or Microsoft')
  if (!oauthStatus()[provider]) return bad(`${provider === 'google' ? 'Google' : 'Microsoft'} sign-in is not available yet. Connect with a password instead.`)
  let hint: string | undefined, mid: string | undefined
  if (b.mailbox_id) {
    const { data: mb } = await serviceClient.from('mailboxes').select('id,user_id,email').eq('id', String(b.mailbox_id)).maybeSingle()
    if (!mb || mb.user_id !== c.businessId) return bad('Mailbox not found', 404)
    mid = mb.id; hint = mb.email
  }
  const state = signState({ biz: c.businessId, uid: c.uid, provider, kind: b.kind === 'staff' ? 'staff' : 'shared', name: b.name ? String(b.name).slice(0, 80) : undefined, mid })
  try { return NextResponse.json({ url: authUrl(provider, state, hint) }) } catch (e: any) { return bad(e.message) }
}
