import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'
import { requireStaffWithBusiness } from '@/lib/admin-auth'
import { companyName } from '@/lib/ai-proposal-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const who = await requireStaffWithBusiness(req)
  if (!who) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_name, source, inquiry } = await req.json()
  if (!inquiry?.trim()) return NextResponse.json({ error: 'inquiry is required' }, { status: 400 })

  const user_id = who.businessId
  const co = await companyName(user_id)
  const systemPrompt = `You are an AI lead qualification assistant for ${co}, a property management business. Given a landlord/property-owner inquiry, do three things, clearly labeled:
1. LEAD QUALITY: rate as Hot, Warm, or Cold, with one line of reasoning.
2. KEY DETAILS: bullet any details worth logging (property type, location, timeline, etc.) found in the message.
3. DRAFT REPLY: a warm, professional reply that asks 1-2 qualifying questions to move the conversation forward, ready to send as-is.`

  const { text: reply, error } = await callClaude(systemPrompt, `Lead name: ${lead_name || 'Unknown'}\nSource: ${source || 'Unknown'}\nInquiry: ${inquiry}`, 500)
  if (error) return NextResponse.json({ error }, { status: 500 })

  if (lead_name?.trim()) {
    await supabase.from('crm_contacts').insert({
      user_id, module: 'str', name: lead_name, type: 'contact', source: source || 'AI Lead Qualification', notes: inquiry,
    })
  }
  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'leads', action: `Qualified lead: ${lead_name || 'Unnamed inquiry'}`, property_name: null,
  })

  return NextResponse.json({ reply })
}
