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

  const { property_id, scheduled_date } = await req.json()
  if (!property_id || !scheduled_date) {
    return NextResponse.json({ error: 'property_id and scheduled_date are required' }, { status: 400 })
  }

  const [{ data: property }, { data: team }] = await Promise.all([
    supabase.from('properties').select('name, address, city, max_guests, house_rules').eq('id', property_id).eq('user_id', user_id).single(),
    supabase.from('team_members').select('name, role').eq('user_id', user_id).ilike('role', '%clean%'),
  ])
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const cleanerList = (team ?? []).map((t: any) => t.name).join(', ') || 'No dedicated cleaner on file — assign from general team'

  const systemPrompt = `You are an AI cleaning coordinator for a short-term rental management company. Draft a short, practical turnover-cleaning checklist and instruction message to send to the cleaner for the property below, ready to send as-is. Include standard STR turnover items (strip beds, restock essentials, check for damage/left items, bins) plus anything implied by the house rules.

Property: ${property?.name ?? 'Unknown'} (${property?.address ?? ''}, ${property?.city ?? ''})
Max guests: ${property?.max_guests ?? 'Unknown'}
House rules: ${property?.house_rules ?? 'None on file'}
Available cleaners: ${cleanerList}`

  const { text: reply, error } = await callClaude(systemPrompt, `Turnover date: ${scheduled_date}. Draft the cleaner instruction message.`, 450)
  if (error) return NextResponse.json({ error }, { status: 500 })

  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'cleaning', action: `Drafted cleaning checklist for ${scheduled_date}`, property_name: property?.name,
  })

  return NextResponse.json({ reply })
}
