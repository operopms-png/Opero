import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → CRM, Landlord Leads, Listings and Client Properties counts,
// read from the account's own records only.
const HIDDEN_LISTING = ['rented', 'archived', 'let agreed']

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const month = new Date().toISOString().slice(0, 7)
  const [boards, items, ll, props, cps] = await Promise.all([
    db.from('crm_boards').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('crm_board_items').select('id', { count: 'exact', head: true }).eq('user_id', biz),
    db.from('landlord_estimates').select('status').eq('business_id', biz),
    db.from('estate_properties').select('listed,status').eq('user_id', biz),
    db.from('client_properties').select('stage,signed_at').eq('business_id', biz),
  ])
  const landlords = (ll.data ?? []) as any[]
  const listings = ((props.data ?? []) as any[]).filter(p => !HIDDEN_LISTING.includes(String(p.status || '').toLowerCase()))
  const cp = (cps.data ?? []) as any[]
  return NextResponse.json({
    crm: { boards: boards.count ?? 0, items: items.count ?? 0 },
    landlordLeads: {
      open: landlords.filter(l => !['signed', 'lost'].includes(String(l.status || '').toLowerCase())).length,
      signed: landlords.filter(l => String(l.status || '').toLowerCase() === 'signed').length,
    },
    listings: { live: listings.filter(p => p.listed).length, off: listings.filter(p => !p.listed).length },
    clientProperties: {
      open: cp.filter(p => !['signed', 'passed'].includes(String(p.stage || '').toLowerCase())).length,
      signedThisMonth: cp.filter(p => String(p.stage || '').toLowerCase() === 'signed' && String(p.signed_at || '').slice(0, 7) === month).length,
    },
  })
}
