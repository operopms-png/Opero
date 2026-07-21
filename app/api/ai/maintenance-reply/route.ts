import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { property_id, title, description, priority, user_id } = await req.json()
  if (!property_id || !title?.trim()) {
    return NextResponse.json({ error: 'property_id and title are required' }, { status: 400 })
  }

  const [{ data: property }, { data: team }] = await Promise.all([
    supabase.from('properties').select('name, address, city').eq('id', property_id).single(),
    supabase.from('team_members').select('name, role').eq('user_id', user_id),
  ])

  const teamList = (team ?? []).map((t: any) => `${t.name} (${t.role})`).join(', ') || 'No team members on file'

  const systemPrompt = `You are an AI maintenance coordinator for a short-term rental management company. Given a maintenance issue, draft a short, clear message to send to the most appropriate available team member/contractor, asking them to look into it. Recommend who from the team list is the best fit based on their role, explain your reasoning in one line, then give the draft message. Be concise and practical.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Priority: ${priority ?? 'medium'}
Available team: ${teamList}`

  const { text: reply, error } = await callClaude(systemPrompt, `Issue title: ${title}\nDescription: ${description || 'No further details provided.'}`, 400)
  if (error) return NextResponse.json({ error }, { status: 500 })

  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'maintenance', action: `Drafted contractor assignment for "${title}"`, property_name: property?.name,
  })

  return NextResponse.json({ reply })
}
