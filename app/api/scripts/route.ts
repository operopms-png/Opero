import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { listScripts } from '@/lib/scripts'

// Marketing → Scripts
//   GET  ?where=email|airbnb  -> scripts (all staff)
//   POST {action: save|delete|used}
// Any staff member can add and edit scripts; deleting is for admins or the
// person who added it.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const str = (v: any, max: number) => String(v ?? '').slice(0, max)

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const w = req.nextUrl.searchParams.get('where')
  const scripts = await listScripts(c.businessId, w === 'email' || w === 'airbnb' ? w : undefined)
  return NextResponse.json({ scripts, me: c.name, isAdmin: c.isAdmin })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))

  if (b.action === 'save') {
    const s = b.script ?? {}
    const row = {
      name: str(s.name, 200).trim(), category: str(s.category, 80).trim() || 'General', stage: str(s.stage, 120).trim() || null,
      kind: s.kind === 'guide' ? 'guide' : 'message', body: str(s.body, 20000), note: str(s.note, 1000).trim() || null,
      show_email: !!s.show_email, show_airbnb: !!s.show_airbnb, // guides show in the picker as read-only tips
      ai_use: !!s.ai_use, sort: Number.isFinite(Number(s.sort)) ? Math.round(Number(s.sort)) : 0,
      updated_by: c.name, updated_at: new Date().toISOString(),
    }
    if (!row.name) return bad('Give the script a name')
    if (!row.body.trim()) return bad('Paste the script text')
    if (s.id) {
      const { data, error } = await serviceClient.from('marketing_scripts').update(row).eq('id', s.id).eq('business_id', c.businessId).select('*').maybeSingle()
      if (error || !data) return bad(error?.message || 'Script not found', 404)
      return NextResponse.json({ ok: true, script: data })
    }
    const { data, error } = await serviceClient.from('marketing_scripts').insert({ ...row, business_id: c.businessId, created_by: c.name }).select('*').single()
    if (error) return bad(error.message)
    return NextResponse.json({ ok: true, script: data })
  }

  if (b.action === 'delete') {
    const { data: s } = await serviceClient.from('marketing_scripts').select('id,created_by').eq('id', b.id).eq('business_id', c.businessId).maybeSingle()
    if (!s) return bad('Script not found', 404)
    if (!c.isAdmin && s.created_by !== c.name) return bad('Only an admin or the person who added it can delete this script', 403)
    await serviceClient.from('marketing_scripts').delete().eq('id', s.id)
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'used') {
    const { data: s } = await serviceClient.from('marketing_scripts').select('id,use_count').eq('id', b.id).eq('business_id', c.businessId).maybeSingle()
    if (s) await serviceClient.from('marketing_scripts').update({ use_count: (s.use_count ?? 0) + 1 }).eq('id', s.id)
    return NextResponse.json({ ok: true })
  }

  return bad('Unknown action')
}
