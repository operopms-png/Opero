import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'
import { requireUser } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const user_id = await requireUser(req)
  if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { property_id, guest_name, message } = await req.json()
  if (!property_id || !message?.trim()) {
    return NextResponse.json({ error: 'property_id and message are required' }, { status: 400 })
  }

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('name, address, city, country, wifi_name, wifi_password, house_rules, checkin_instructions, checkout_instructions')
    .eq('id', property_id)
    .eq('user_id', user_id)
    .single()

  if (propError || !property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const knowledge = `
Property: ${property.name}
Address: ${property.address ?? ''}, ${property.city ?? ''}, ${property.country ?? ''}
WiFi network: ${property.wifi_name ?? 'Not provided'}
WiFi password: ${property.wifi_password ?? 'Not provided'}
Check-in instructions: ${property.checkin_instructions ?? 'Not provided'}
Check-out instructions: ${property.checkout_instructions ?? 'Not provided'}
House rules: ${property.house_rules ?? 'Not provided'}
`.trim()

  const systemPrompt = `You are a friendly, professional short-term rental guest support assistant for Sangsters Group. Answer the guest's message using ONLY the property information provided below. If the answer isn't covered by this information, politely say you'll check with the host and follow up — never invent details (like WiFi passwords, exact addresses, or rules) that aren't in the provided info. Keep replies warm, concise, and ready to send as-is.

${knowledge}`

  const { text: reply, error } = await callClaude(systemPrompt, `Guest name: ${guest_name || 'Guest'}\nGuest message: ${message}`, 500)
  if (error) return NextResponse.json({ error }, { status: 500 })

  // Log both the inbound guest message and the AI's drafted reply
  await supabase.from('guest_messages').insert([
    { user_id, property_id, guest_name, message, sender: 'guest' },
    { user_id, property_id, guest_name, message: reply, sender: 'ai' },
  ])
  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'guest', action: `Drafted reply to ${guest_name || 'guest'}'s question`, property_name: property.name,
  })

  return NextResponse.json({ reply })
}
