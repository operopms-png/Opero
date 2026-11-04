import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient as db } from '@/lib/admin-auth'
import { sanitizeLayout } from '@/lib/flat-layout'

// POST { source: 'pm'|'estate', unitId, planUrl?, layout? } -> saves a flat's floor plan image and/or 3D room layout
export async function POST(req: NextRequest) {
  const s = await requireStaffWithBusiness(req)
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (!/^[0-9a-f-]{36}$/i.test(String(b.unitId || ''))) return NextResponse.json({ error: 'Missing flat' }, { status: 400 })
  const patch: Record<string, any> = {}
  if (b.planUrl !== undefined) {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const u = b.planUrl ? String(b.planUrl) : null
    if (u && !u.startsWith(base + '/storage/v1/object/public/')) return NextResponse.json({ error: 'Upload the plan first' }, { status: 400 })
    patch.plan_url = u
  }
  if (b.layout !== undefined) {
    if (b.layout === null) patch.layout = null
    else { const l = sanitizeLayout(b.layout); if (!l) return NextResponse.json({ error: 'Add at least one room' }, { status: 400 }); patch.layout = l }
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
  const { error } = await db.from(b.source === 'estate' ? 'estate_units' : 'pm_units').update(patch).eq('id', b.unitId).eq('user_id', s.businessId)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
