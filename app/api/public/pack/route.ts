import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { docSettings } from '@/lib/documents'
import { cleanPack } from '@/lib/pack-calc'

// The page an investor opens from a pack link (/p/[token]). No login.
//   GET ?t=<token>  -> { name, company, data }   records an open; a Sent pack becomes Opened
// A draft, paused or deleted pack answers "not found".
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || ''
  const gone = () => NextResponse.json({ error: 'This link is no longer available.' }, { status: 404 })
  if (!/^[0-9a-f]{16,64}$/.test(t)) return gone()
  const { data: p } = await db.from('invest_packs').select('*').eq('token', t).eq('active', true).neq('stage', 'draft').maybeSingle()
  if (!p) return gone()
  const s = await docSettings(p.business_id)
  const patch: any = { opens: (p.opens || 0) + 1, last_opened_at: new Date().toISOString() }
  if (p.stage === 'sent') patch.stage = 'opened'
  await db.from('invest_packs').update(patch).eq('id', p.id)
  return NextResponse.json({ name: p.name, company: s.company_name, data: cleanPack(p.data) })
}
