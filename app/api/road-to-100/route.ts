import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'
import { linkLeads, managedHomes, ownerEnquiries30, signedProps } from '@/lib/road-data'
import { buildRoad, DEFAULT_DEADLINE } from '@/lib/road-to-100'

// Road to 100 properties. The goal (target, deadline, homes already managed) lives in growth_goal, one row per company.
// Progress is the homes already in Property Management / Estate Agency, plus any extra homes entered, plus Landlord Leads marked Signed, plus Client Properties in the Signed stage.
//   GET -> Road        POST { target?, deadline?, baseline? } -> Road
async function gate(req: NextRequest, write = false) {
  const c = await getCaller(req)
  if (!c) return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await hasScTab(c, 'companydocs')) && (write || !(await hasScTab(c, 'oversight')))) return { err: NextResponse.json({ error: 'You don’t have access to this.' }, { status: 403 }) }
  return { biz: c.businessId as string }
}

async function load(biz: string) {
  let { data: g } = await db.from('growth_goal').select('*').eq('business_id', biz).maybeSingle()
  if (!g) {
    const ins = await db.from('growth_goal').insert({ business_id: biz, deadline: DEFAULT_DEADLINE }).select('*').single()
    g = ins.data
  }
  const { data: leads } = await db.from('landlord_estimates').select('id,status,created_at,updated_at').eq('business_id', biz).limit(5000)
  const [sp, managed, enquiries30] = await Promise.all([signedProps(biz), managedHomes(biz), ownerEnquiries30(biz)])
  const props = { ...sp, managed, enquiries30 }
  return buildRoad({ title: g?.title || 'Road to 100 properties', target: g?.target ?? 100, deadline: g?.deadline ?? null, baseline: g?.baseline ?? 0 }, await linkLeads(biz, leads || []), props)
}

export async function GET(req: NextRequest) {
  const g = await gate(req); if ('err' in g) return g.err
  return NextResponse.json(await load(g.biz))
}

export async function POST(req: NextRequest) {
  const g = await gate(req, true); if ('err' in g) return g.err
  const b = await req.json().catch(() => ({}))
  await load(g.biz)
  const patch: any = { updated_at: new Date().toISOString() }
  if (b.target !== undefined) { const n = Math.round(Number(b.target)); if (!(n > 0 && n <= 100000)) return NextResponse.json({ error: 'Target must be a number above 0.' }, { status: 400 }); patch.target = n }
  if (b.baseline !== undefined) { const n = Math.round(Number(b.baseline)); if (!(n >= 0 && n <= 100000)) return NextResponse.json({ error: 'Starting number must be 0 or more.' }, { status: 400 }); patch.baseline = n }
  if (b.deadline !== undefined) { if (b.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(String(b.deadline))) return NextResponse.json({ error: 'Use a date.' }, { status: 400 }); patch.deadline = b.deadline || null }
  const { error } = await db.from('growth_goal').update(patch).eq('business_id', g.biz)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(await load(g.biz))
}
