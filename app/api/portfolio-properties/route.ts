import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Properties in the company's portfolio, for pickers on links and documents.
//   GET ?q=<text>   -> { properties: [{ id, label, section }] }   (ended properties are left out)
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId, t = (req.nextUrl.searchParams.get('q') || '').trim().replace(/[%_,()]/g, ' ')
  const like = `%${t}%`
  const f = (q: any) => (t ? q.or(`name.ilike.${like},address.ilike.${like}`) : q)
  const [pm, ea, vr] = await Promise.all([
    f(db.from('pm_properties').select('id,name,address').eq('user_id', biz).is('ended_at', null)).order('name').limit(60),
    f(db.from('estate_properties').select('id,name,address').eq('user_id', biz).is('ended_at', null)).order('name').limit(60),
    f(db.from('properties').select('id,name,address').or(`user_id.eq.${biz},company_id.eq.${biz}`)).order('name').limit(60),
  ])
  const mk = (rows: any, section: string) => ((rows.data ?? []) as any[]).map(p => ({ id: p.id, section, label: [p.name, p.address && p.address !== p.name ? p.address : ''].filter(Boolean).join(' — ') }))
  return NextResponse.json({ properties: [...mk(pm, 'Property Management'), ...mk(ea, 'Estate Agency'), ...mk(vr, 'Vacation Rentals')].slice(0, 150) })
}
