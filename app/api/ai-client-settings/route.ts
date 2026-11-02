import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCaller } from '@/lib/mailbox'

// AI house style for the caller's business: tone, country rules, sign-off.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const clip = (v: any, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await db.from('ai_client_settings').select('tone, country_rules, signoff').eq('user_id', c.businessId).maybeSingle()
  return NextResponse.json({ tone: data?.tone ?? '', country_rules: data?.country_rules ?? '', signoff: data?.signoff ?? '' })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const { error } = await db.from('ai_client_settings').upsert({
    user_id: c.businessId, tone: clip(b.tone, 500), country_rules: clip(b.country_rules, 2000), signoff: clip(b.signoff, 200), updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message.includes('ai_client_settings') ? 'Run migrations/add-ai-client-settings.sql in Supabase first.' : error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
