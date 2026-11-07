import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { requireOwner, clientLabels } from '@/lib/platform-owner-auth'

// Platform Owner → Audit Log: every recorded change across every client company (pm_audit_log),
// newest first. Owner login only. ?client=<business id> narrows to one client, ?limit= up to 500.
export async function GET(req: NextRequest) {
  if (!(await requireOwner(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const client = req.nextUrl.searchParams.get('client')
  const limit = Math.min(500, Math.max(10, Number(req.nextUrl.searchParams.get('limit')) || 200))
  let q = db.from('pm_audit_log').select('id, user_id, table_name, record_id, action, changed_by, changed_by_email, changes, record_label, created_at').order('created_at', { ascending: false }).limit(limit)
  if (client) q = q.eq('user_id', client)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = data ?? []
  const ids = Array.from(new Set(rows.map((r: any) => r.user_id)))
  const labels = await clientLabels(ids)
  const { data: all } = await db.from('pm_audit_log').select('user_id').limit(20000)
  const allIds = Array.from(new Set((all ?? []).map((r: any) => r.user_id)))
  const allLabels = await clientLabels(allIds)
  return NextResponse.json({
    rows: rows.map((r: any) => ({ ...r, client: labels[r.user_id]?.name ?? 'Unknown client' })),
    clients: allIds.map(id => ({ id, name: allLabels[id]?.name ?? 'Unknown client' })).sort((a, b) => a.name.localeCompare(b.name)),
  })
}
