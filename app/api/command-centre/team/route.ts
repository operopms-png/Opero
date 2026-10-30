import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → Portals, Smart Home, Team and Announcements counts, from the account's own records.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [cp, sp, locs, devs, team, ann] = await Promise.all([
    db.from('client_portals').select('live').eq('user_id', biz),
    db.from('staff_portals').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('smart_locations').select('id', { count: 'exact', head: true }).eq('business_id', biz),
    db.from('smart_devices').select('online').eq('business_id', biz),
    db.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('announcements').select('created_at').eq('business_id', biz),
  ])
  const clientPortals = (cp.data ?? []) as any[]
  const devices = (devs.data ?? []) as any[]
  const anns = (ann.data ?? []) as any[]
  return NextResponse.json({
    portals: {
      live: clientPortals.filter(p => p.live).length,
      total: clientPortals.length,
      propertyPortals: sp.count ?? 0,
    },
    smartHome: {
      locations: locs.count ?? 0,
      devices: devices.length,
      online: devices.filter(d => d.online).length,
    },
    team: { members: team.count ?? 0 },
    announcements: {
      total: anns.length,
      last30: anns.filter(a => String(a.created_at) >= since).length,
    },
  })
}
