import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller, canAccess } from '@/lib/mailbox'
import { basePrompt, getSettings, isOpen, parseJSON, FAST_MODEL } from '@/lib/receptionist'
import { callClaude } from '@/lib/claude'

// AI Receptionist hub:
//   GET                      -> settings, activity log, channel status
//   POST {action:'save', ...} (admins) | {action:'resolve', id, resolved}
//        {action:'mailbox_mode', id, ai_mode} (admins) | {action:'test', channel, messages}
export const maxDuration = 30
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

const EDITABLE = ['assistant_name', 'company_name', 'knowledge', 'sync_website_chat', 'timezone', 'hours', 'alert_email', 'portal_mode', 'portal_create_maintenance', 'phone_mode', 'phone_greeting', 'phone_voice', 'phone_transfer_number', 'phone_ring_seconds']

async function ensureSettings(biz: string) {
  let s = await getSettings(biz)
  if (!s) {
    const { data: chat } = await serviceClient.from('website_chat_settings').select('assistant_name,knowledge,alert_email,company_name').eq('business_id', biz).maybeSingle()
    await serviceClient.from('ai_receptionist_settings').insert({ business_id: biz, assistant_name: chat?.assistant_name || 'Sangsters Assistant', knowledge: chat?.knowledge ?? null, alert_email: chat?.alert_email ?? null, company_name: chat?.company_name || 'Sangsters' })
    s = await getSettings(biz)
  }
  return s!
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const s = await ensureSettings(c.businessId)
  const [log, mbs, phones, chat] = await Promise.all([
    serviceClient.from('ai_receptionist_log').select('*').eq('business_id', c.businessId).neq('action', 'processing').order('created_at', { ascending: false }).limit(200),
    serviceClient.from('mailboxes').select('id,email,status,ai_mode,user_id,access,access_teams').eq('user_id', c.businessId).order('email'),
    serviceClient.from('whatsapp_connections').select('id,phone_number').eq('user_id', c.businessId),
    serviceClient.from('website_chat_settings').select('enabled,assistant_name').eq('business_id', c.businessId).maybeSingle(),
  ])
  return NextResponse.json({
    settings: s, open: isOpen(s), isAdmin: c.isAdmin,
    log: log.data ?? [],
    mailboxes: (mbs.data ?? []).filter(m => canAccess(m, c)).map(({ access, access_teams, user_id, ...m }) => m),
    phones: phones.data ?? [],
    websiteChat: chat.data ?? null,
    aiReady: !!process.env.ANTHROPIC_API_KEY,
  })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'save') {
    if (!c.isAdmin) return bad('Only admins can change the receptionist', 403)
    const patch: any = { updated_at: new Date().toISOString() }
    for (const k of EDITABLE) if (b[k] !== undefined) patch[k] = b[k]
    if (patch.portal_mode && !['off', 'always', 'out_of_hours'].includes(patch.portal_mode)) return bad('Bad portal mode')
    if (patch.phone_mode && !['off', 'always', 'no_answer', 'out_of_hours'].includes(patch.phone_mode)) return bad('Bad phone mode')
    if (patch.phone_ring_seconds !== undefined) patch.phone_ring_seconds = Math.min(60, Math.max(5, Number(patch.phone_ring_seconds) || 20))
    await ensureSettings(c.businessId)
    const { error } = await serviceClient.from('ai_receptionist_settings').update(patch).eq('business_id', c.businessId)
    if (error) return bad(error.message)
    const s = await getSettings(c.businessId)
    if (s?.sync_website_chat && (patch.knowledge !== undefined || patch.assistant_name !== undefined)) {
      await serviceClient.from('website_chat_settings').update({ knowledge: s.knowledge, assistant_name: s.assistant_name, updated_at: new Date().toISOString() }).eq('business_id', c.businessId)
    }
    return NextResponse.json({ settings: s })
  }

  if (b.action === 'resolve') {
    const { error } = await serviceClient.from('ai_receptionist_log').update({ resolved: !!b.resolved }).eq('id', b.id).eq('business_id', c.businessId)
    if (error) return bad(error.message)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'mailbox_mode') {
    if (!c.isAdmin) return bad('Only admins can change this', 403)
    if (!['off', 'draft', 'auto'].includes(b.ai_mode)) return bad('Bad mode')
    const { error } = await serviceClient.from('mailboxes').update({ ai_mode: b.ai_mode }).eq('id', b.id).eq('user_id', c.businessId)
    if (error) return bad(error.message)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'test') {
    const s = await ensureSettings(c.businessId)
    const channel = b.channel === 'phone' ? 'phone (read aloud; 1–3 short sentences)' : b.channel === 'email' ? 'email' : b.channel === 'portal' ? 'the tenant/landlord portal chat' : 'website chat'
    const convo = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map((m: any) => `${m.role === 'user' ? 'CUSTOMER' : 'YOU'}: ${String(m.text ?? '').slice(0, 2000)}`).join('\n')
    const system = basePrompt(s, channel) + `\n\nThis is a staff test of how you'd respond. Reply ONLY with JSON: {"reply": "your reply", "would_do": "what you would do behind the scenes, e.g. take a message / log a repair / alert staff / nothing"}`
    const r = await callClaude(system, `Conversation so far:\n${convo}\n\nWrite your next reply.`, 600, b.channel === 'phone' ? FAST_MODEL : undefined)
    if (r.error) return bad(r.error.includes('not configured') ? 'The AI key is not set up on the server yet.' : 'The AI did not respond — try again.', 502)
    const out = parseJSON(r.text) ?? { reply: r.text ?? '', would_do: '' }
    return NextResponse.json(out)
  }

  return bad('Unknown action')
}
