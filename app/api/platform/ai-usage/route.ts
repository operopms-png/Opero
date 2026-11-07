import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner, clientLabels } from '@/lib/platform-owner-auth'

// Platform Owner → AI Usage and Costs: what the AI costs per client (from the ai_usage_log table,
// written by lib/ai-usage.ts on every AI call). Owner login only. ?days=30 (default) or 7 / 90.
export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const { data } = await db.from('ai_usage_log').select('business_id, source, input_tokens, output_tokens, cost_usd, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(50000)
  const rows = data ?? []
  const first = await db.from('ai_usage_log').select('created_at').order('created_at', { ascending: true }).limit(1)

  type Acc = { id: string | null; calls: number; input: number; output: number; cost: number; bySource: Record<string, number> }
  const clients = new Map<string, Acc>()
  const daily: Record<string, number> = {}
  let total = 0, calls = 0
  for (const r of rows as any[]) {
    const k = r.business_id ?? 'none'
    const c: Acc = clients.get(k) ?? { id: r.business_id, calls: 0, input: 0, output: 0, cost: 0, bySource: {} }
    const cost = Number(r.cost_usd) || 0
    c.calls++; c.input += r.input_tokens || 0; c.output += r.output_tokens || 0; c.cost += cost
    c.bySource[r.source] = (c.bySource[r.source] || 0) + cost
    clients.set(k, c)
    const day = String(r.created_at).slice(0, 10)
    daily[day] = (daily[day] || 0) + cost
    total += cost; calls++
  }
  const labels = await clientLabels(Array.from(clients.values()).map(c => c.id ?? ''))
  const list = Array.from(clients.values()).map(c => ({
    ...c, name: c.id ? labels[c.id]?.name : 'Not attributed to a client', email: c.id ? labels[c.id]?.email : '',
    perCall: c.calls ? c.cost / c.calls : 0,
  })).sort((a, b) => b.cost - a.cost)
  return NextResponse.json({ days, total, calls, clients: list, daily, trackingSince: first.data?.[0]?.created_at ?? null })
}
