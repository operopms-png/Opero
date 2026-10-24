import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/admin-auth'
import { APPROVED_ANSWERS, HOLDING_REPLY, escalationReason } from '@/lib/tenantAssistant'

// Replies to a tenant's new message in the tenant portal.
// Called by the tenant portal right after the tenant sends a message.
// The AI only chooses which approved topic fits; the reply text is always the approved answer.
// Anything else goes to a person with a holding reply and a staff alert.

export const maxDuration = 60

async function pickTopic(text: string): Promise<{ topic: string; asks_for_person: boolean } | null> {
  const apiKey = process.env.XAI_API_KEY
  const model = process.env.XAI_MODEL
  if (!apiKey || !model || APPROVED_ANSWERS.length === 0) return null

  const list = APPROVED_ANSWERS.map(a => `${a.id}: ${a.topic}`).join('\n')
  const ctrl = new AbortController()
  const stop = setTimeout(() => ctrl.abort(), 40000)
  try {
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: `You sort tenant messages. Choose the one topic id from the list that the message is about, or "none" if no topic clearly fits. Set asks_for_person to true if the tenant wants to speak to a person. Reply with JSON only: {"topic": "<id or none>", "asks_for_person": true|false}.\nTopics:\n${list}`,
        input: text,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const out: string = typeof data?.output_text === 'string'
      ? data.output_text
      : (data?.output ?? []).filter((i: any) => i?.type === 'message').flatMap((i: any) => i?.content ?? []).filter((p: any) => p?.type === 'output_text').map((p: any) => p?.text ?? '').join('')
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    return { topic: String(parsed.topic ?? 'none'), asks_for_person: parsed.asks_for_person === true }
  } catch {
    return null
  } finally {
    clearTimeout(stop)
  }
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const messageId = String(body?.message_id ?? '')
  if (!messageId) return NextResponse.json({ error: 'message_id is required.' }, { status: 400 })

  // The tenant must own this message.
  const { data: tenant } = await serviceClient
    .from('pm_tenants')
    .select('id, name, user_id')
    .eq('portal_user_id', user.id)
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'No tenant account found.' }, { status: 403 })

  const { data: msg } = await serviceClient
    .from('pm_tenant_messages')
    .select('id, message, sender, tenant_id')
    .eq('id', messageId)
    .eq('tenant_id', tenant.id)
    .eq('sender', 'tenant')
    .maybeSingle()
  if (!msg) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })

  const text = String(msg.message ?? '')
  const rule = escalationReason(text)
  const picked = rule ? null : await pickTopic(text)
  const approved = picked && !picked.asks_for_person && picked.topic !== 'none'
    ? APPROVED_ANSWERS.find(a => a.id === picked.topic)
    : undefined

  if (approved) {
    await serviceClient.from('pm_tenant_messages').insert({ tenant_id: tenant.id, sender: 'assistant', message: approved.answer })
    return NextResponse.json({ handled: 'assistant' })
  }

  // Goes to a person: holding reply to the tenant, alert to staff.
  const reason = rule ?? (picked?.asks_for_person ? 'asked for a person' : 'no approved answer')
  await serviceClient.from('pm_tenant_messages').insert({ tenant_id: tenant.id, sender: 'assistant', message: HOLDING_REPLY })
  await serviceClient.from('notifications').insert({
    user_id: tenant.user_id,
    module: 'pm',
    type: 'tenant_message',
    title: `Tenant needs a person: ${tenant.name ?? 'tenant'} (${reason})`,
    link: '/pm',
  })
  return NextResponse.json({ handled: 'person', reason })
}
