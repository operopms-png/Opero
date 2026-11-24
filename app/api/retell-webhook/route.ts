export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Retell from 'retell-sdk'
import { createClient } from '@supabase/supabase-js'

type CustomAnalysisData = {
  caller_name?: string
  callback_number?: string
  reason?: string
  caller_type?: string
}

type RetellCall = {
  call_id: string
  agent_id?: string
  direction?: 'inbound' | 'outbound'
  from_number?: string
  to_number?: string
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number
  transcript?: string
  recording_url?: string
  disconnection_reason?: string
  call_analysis?: {
    call_summary?: string
    user_sentiment?: string
    custom_analysis_data?: CustomAnalysisData
  }
}

type RetellWebhookPayload = {
  event: 'call_started' | 'call_ended' | 'call_analyzed' | string
  call: RetellCall
}

const HANDLED_EVENTS = new Set(['call_started', 'call_ended', 'call_analyzed'])

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-retell-signature') ?? ''

  const isValid = await Retell.verify(rawBody, process.env.RETELL_API_KEY!, signature)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as RetellWebhookPayload
  if (!HANDLED_EVENTS.has(payload.event)) {
    return NextResponse.json({ received: true })
  }

  const call = payload.call
  const customAnalysisData = call.call_analysis?.custom_analysis_data

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Which company this call belongs to: looked up by the Retell agent that took it, falling
  // back to the number it came in on. Not found (not connected to a company yet) leaves
  // business_id untouched rather than nulling out a value an earlier event already set.
  let businessId: string | null = null
  if (call.agent_id) {
    const { data } = await supabase.from('retell_agent_map').select('business_id').eq('agent_id', call.agent_id).maybeSingle()
    businessId = data?.business_id ?? null
  }
  if (!businessId && call.to_number) {
    const { data } = await supabase.from('retell_agent_map').select('business_id').eq('to_number', call.to_number).maybeSingle()
    businessId = data?.business_id ?? null
  }

  const { error } = await supabase.from('phone_calls').upsert({
    call_id: call.call_id,
    ...(businessId ? { business_id: businessId } : {}),
    direction: call.direction ?? null,
    from_number: call.from_number ?? null,
    to_number: call.to_number ?? null,
    started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
    ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
    duration_seconds: call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
    transcript: call.transcript ?? null,
    summary: call.call_analysis?.call_summary ?? null,
    sentiment: call.call_analysis?.user_sentiment ?? null,
    caller_name: customAnalysisData?.caller_name ?? null,
    callback_number: customAnalysisData?.callback_number ?? null,
    reason: customAnalysisData?.reason ?? null,
    caller_type: customAnalysisData?.caller_type ?? null,
    extracted: customAnalysisData ?? null,
    recording_url: call.recording_url ?? null,
    disconnection_reason: call.disconnection_reason ?? null,
  }, { onConflict: 'call_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
