import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { encrypt } from '@/lib/mailbox'
import { metaConfigured, exchangeCode, phoneInfo, subscribeApp } from '@/lib/whatsapp-meta'

// Settings -> WhatsApp and the Inbox WhatsApp channel.
// GET  -> { configured, isAdmin, appId, configId, webhookPath, connections: [...] }   (no tokens ever leave the server)
// POST { action:'connect', phone_number_id, waba_id, code? | access_token?, label? }  (admins)
//      { action:'update', id, label?, ai_receptionist_enabled?, ai_when?, ai_receptionist_greeting?, ai_receptionist_business_info? }
//      { action:'remove', id }
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const COLS = 'id,label,phone_number,verified_name,quality,status,connected_by_name,created_at,ai_receptionist_enabled,ai_when,ai_receptionist_greeting,ai_receptionist_business_info'

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const { data } = await db.from('whatsapp_connections').select(COLS).eq('user_id', c.businessId).eq('provider', 'meta').order('created_at')
  return NextResponse.json({
    configured: metaConfigured(), isAdmin: c.isAdmin,
    appId: process.env.NEXT_PUBLIC_META_APP_ID || null, configId: process.env.NEXT_PUBLIC_META_CONFIG_ID || null,
    connections: (data ?? []).map(({ phone_number, ...r }: any) => ({ ...r, phone: phone_number })),
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  if (!c.isAdmin) return bad('Only an account admin can change WhatsApp settings.', 403)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'connect') {
    if (!metaConfigured()) return bad('WhatsApp is not switched on for the platform yet. Add META_APP_ID, META_APP_SECRET and WHATSAPP_VERIFY_TOKEN in Netlify.', 503)
    const phoneNumberId = String(b.phone_number_id || '').trim(), wabaId = String(b.waba_id || '').trim()
    if (!/^\d{5,25}$/.test(phoneNumberId) || !/^\d{5,25}$/.test(wabaId)) return bad('Enter the Phone number ID and the WhatsApp Business Account ID from Meta (digits only).')
    let token = String(b.access_token || '').trim()
    if (!token && b.code) {
      const x = await exchangeCode(String(b.code))
      if (x.error) return bad(x.error, 502)
      token = x.token!
    }
    if (!token) return bad('Paste the access token from Meta, or use Connect with Facebook.')
    const info = await phoneInfo(phoneNumberId, token)
    if ('error' in info && info.error) return bad(`Meta would not let us use that number: ${info.error}`, 502)
    const sub = await subscribeApp(wabaId, token)
    if (!sub.ok) return bad(`Connected to the number but could not subscribe to its messages: ${sub.error}`, 502)
    const phone = info.phone ? '+' + info.phone : null
    if (!phone) return bad('Meta did not return the phone number.', 502)
    const { data: clash } = await db.from('whatsapp_connections').select('id,user_id').or(`phone_number_id.eq.${phoneNumberId},phone_number.eq.${phone}`).limit(1)
    if (clash?.[0] && clash[0].user_id !== c.businessId) return bad('That number is already connected to another company.', 409)
    const row = {
      user_id: c.businessId, provider: 'meta', label: String(b.label || info.verifiedName || 'WhatsApp').slice(0, 60), phone_number: phone,
      phone_number_id: phoneNumberId, waba_id: wabaId, access_token_enc: encrypt(token), verified_name: info.verifiedName ?? null, quality: info.quality ?? null,
      status: 'connected', connected_by_name: c.name, connected_by_email: c.email,
    }
    const q = clash?.[0] ? db.from('whatsapp_connections').update(row).eq('id', clash[0].id) : db.from('whatsapp_connections').insert(row)
    const { data, error } = await q.select(COLS).single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ connection: { ...data, phone: (data as any).phone_number } })
  }

  const id = String(b.id || '')
  const { data: conn } = await db.from('whatsapp_connections').select('id').eq('id', id).eq('user_id', c.businessId).maybeSingle()
  if (!conn) return bad('Connection not found', 404)

  if (b.action === 'update') {
    const patch: any = {}
    if (typeof b.label === 'string') patch.label = b.label.slice(0, 60) || 'WhatsApp'
    if (typeof b.ai_receptionist_enabled === 'boolean') patch.ai_receptionist_enabled = b.ai_receptionist_enabled
    if (b.ai_when !== undefined) { if (!['always', 'out_of_hours'].includes(b.ai_when)) return bad('Bad AI setting'); patch.ai_when = b.ai_when }
    if (b.ai_receptionist_greeting !== undefined) patch.ai_receptionist_greeting = String(b.ai_receptionist_greeting || '').slice(0, 500) || null
    if (b.ai_receptionist_business_info !== undefined) patch.ai_receptionist_business_info = String(b.ai_receptionist_business_info || '').slice(0, 6000) || null
    await db.from('whatsapp_connections').update(patch).eq('id', id)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'remove') {
    await db.from('whatsapp_connections').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
