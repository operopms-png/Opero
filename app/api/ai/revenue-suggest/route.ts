import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { property_id, user_id } = await req.json()
  if (!property_id) return NextResponse.json({ error: 'property_id is required' }, { status: 400 })

  const { data: property } = await supabase.from('properties').select('name, nightly_rate, max_guests, city, country').eq('id', property_id).single()
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('check_in, check_out, total_amount, status')
    .eq('property_id', property_id)
    .gte('check_in', ninetyAgo)

  const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
  const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)
  const occupancyPct = Math.min(100, Math.round((nights / 90) * 100))
  const avgNightly = nights > 0 ? Math.round(active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0) / nights) : 0

  const systemPrompt = `You are an AI revenue manager for a short-term rental. Based on the occupancy and booking data below (no external competitor data is available — reason from the property's own performance), recommend whether to raise, lower, or hold the current nightly rate, by how much (a specific number), and why. Keep it to 3-4 sentences, direct and actionable — this will be read by a busy property manager.

Property: ${property.name} (${property.city ?? ''}, ${property.country ?? ''}), max ${property.max_guests ?? '?'} guests
Current listed nightly rate: £${property.nightly_rate ?? 'not set'}
Last 90 days occupancy: ${occupancyPct}%
Last 90 days average realized nightly rate from actual bookings: £${avgNightly || 'no bookings in period'}`

  const { text: reply, error } = await callClaude(systemPrompt, 'Give your rate recommendation.', 350)
  if (error) return NextResponse.json({ error }, { status: 500 })

  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'revenue', action: `Suggested rate review (${occupancyPct}% occupancy, 90d)`, property_name: property.name,
  })

  return NextResponse.json({ reply, occupancyPct, avgNightly })
}
