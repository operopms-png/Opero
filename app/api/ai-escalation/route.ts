import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'
import { normalizePhone } from '@/lib/sms'

// Escalation rules for the caller's business. See lib/ai-escalation.ts for what each trigger does.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TRIGGERS = ['draft_waiting', 'failed_action', 'expired_certificate', 'arrears']
const MISSING = 'Run migrations/add-ai-escalation-and-runlog.sql in Supabase first.'

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('ai_escalation_rules').select('*').eq('user_id', c.businessId).order('created_at')
  if (error) return NextResponse.json({ error: error.message.includes('ai_escalation_rules') ? MISSING : error.message }, { status: 500 })
  return NextResponse.json({ rules: data ?? [], me: c.email })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const biz = c.businessId

  if (b.action === 'add') {
    const email = String(b.notify_email ?? '').trim()
    if (!TRIGGERS.includes(b.trigger)) return NextResponse.json({ error: 'Choose what should trigger the rule.' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    const phoneRaw = String(b.notify_phone ?? '').trim()
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null
    if (phoneRaw && !phone) return NextResponse.json({ error: 'That mobile number is not valid. Include the country code, for example +44 7700 900123.' }, { status: 400 })
    const hours = Math.min(720, Math.max(1, parseInt(b.after_hours) || 24))
    const { error } = await db.from('ai_escalation_rules').insert({ user_id: biz, trigger: b.trigger, after_hours: hours, notify_email: email, notify_name: String(b.notify_name ?? '').trim().slice(0, 80) || null, notify_phone: phone })
    if (error) return NextResponse.json({ error: error.message.includes('ai_escalation_rules') ? MISSING : error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  if (b.action === 'defaults') {
    const to = c.email
    if (!to) return NextResponse.json({ error: 'No email on your account.' }, { status: 400 })
    const { error } = await db.from('ai_escalation_rules').insert([
      { user_id: biz, trigger: 'draft_waiting', after_hours: 24, notify_email: to, notify_name: c.name },
      { user_id: biz, trigger: 'failed_action', after_hours: 1, notify_email: to, notify_name: c.name },
      { user_id: biz, trigger: 'expired_certificate', after_hours: 1, notify_email: to, notify_name: c.name },
    ])
    if (error) return NextResponse.json({ error: error.message.includes('ai_escalation_rules') ? MISSING : error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  if (b.action === 'toggle' && b.id) {
    const { error } = await db.from('ai_escalation_rules').update({ enabled: !!b.enabled }).eq('id', b.id).eq('user_id', biz)
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true })
  }
  if (b.action === 'delete' && b.id) {
    const { error } = await db.from('ai_escalation_rules').delete().eq('id', b.id).eq('user_id', biz)
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
