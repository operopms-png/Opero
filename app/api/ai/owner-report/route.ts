import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude } from '@/lib/claude'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { owner_id, user_id } = await req.json()
  if (!owner_id) return NextResponse.json({ error: 'owner_id is required' }, { status: 400 })

  const { data: owner } = await supabase.from('owner_profiles').select('*').eq('id', owner_id).single()
  if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })

  const ids: string[] = owner.property_ids ?? []
  const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [{ data: properties }, { data: bookings }] = await Promise.all([
    supabase.from('properties').select('name').in('id', safeIds),
    supabase.from('bookings').select('check_in, check_out, total_amount, status, property_id').in('property_id', safeIds).gte('check_in', thirtyAgo),
  ])

  const active = (bookings ?? []).filter((b: any) => b.status !== 'cancelled')
  const revenue = active.reduce((s: number, b: any) => s + (Number(b.total_amount) || 0), 0)
  const ownerShare = revenue * ((owner.split_percentage ?? 60) / 100)
  const nights = active.reduce((s: number, b: any) => s + Math.max(0, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)), 0)

  const systemPrompt = `You are an AI assistant drafting a friendly, professional monthly owner report email for a short-term rental management company (Sangsters Group) to send to a property owner. Use only the figures given below — do not invent numbers. Keep it warm but concise, structured with a brief summary followed by the key figures, ready to send as-is.

Owner: ${owner.name}
Properties: ${(properties ?? []).map((p: any) => p.name).join(', ') || 'None on file'}
Period: last 30 days
Total bookings revenue: £${revenue.toLocaleString()}
Owner's share (${owner.split_percentage ?? 60}%): £${ownerShare.toLocaleString(undefined, { maximumFractionDigits: 0 })}
Nights booked: ${nights}`

  const { text: reply, error } = await callClaude(systemPrompt, 'Draft the monthly owner report.', 500)
  if (error) return NextResponse.json({ error }, { status: 500 })

  await supabase.from('ai_activity_log').insert({
    user_id, agent_key: 'owner', action: `Drafted monthly report for ${owner.name}`, property_name: (properties ?? []).map((p: any) => p.name).join(', '),
  })

  return NextResponse.json({ reply, revenue, ownerShare, nights })
}
