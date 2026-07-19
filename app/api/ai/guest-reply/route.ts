import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { property_id, guest_name, message, user_id } = await req.json()
  if (!property_id || !message?.trim()) {
    return NextResponse.json({ error: 'property_id and message are required' }, { status: 400 })
  }

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('name, address, city, country, wifi_name, wifi_password, house_rules, checkin_instructions, checkout_instructions')
    .eq('id', property_id)
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }, { status: 500 })
  }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Guest name: ${guest_name || 'Guest'}\nGuest message: ${message}` }],
    }),
  })

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    return NextResponse.json({ error: `Claude API error: ${errText}` }, { status: 500 })
  }

  const claudeData = await claudeRes.json()
  const reply = claudeData.content?.find((c: any) => c.type === 'text')?.text ?? ''

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
