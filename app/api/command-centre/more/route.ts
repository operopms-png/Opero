import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// AI Command Centre → the remaining Property Management, Developments, Vacation Rentals,
// Documents, Finance and Reports areas. Counts from the account's own records only.
export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const biz = c.businessId
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
  const d7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const d30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const d90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const sum = (rows: any[], f: string) => Math.round(rows.reduce((a, r) => a + (Number(r[f]) || 0), 0))

  const [units, buildings, landlords, tenants, furniture, devs, props, rtr, hmo, insp, inv, keys, utils,
    pmDocs, compDocs, audit, expenses, banks, mortgages, estMortgages, pmComp, estComp, strComp, dev_comp] = await Promise.all([
    db.from('pm_units').select('id,status').eq('user_id', biz),
    db.from('pm_buildings').select('id,total_units').eq('user_id', biz),
    db.from('pm_landlords').select('id,account_number,sort_code,iban').eq('user_id', biz),
    db.from('pm_tenants').select('id,status').eq('user_id', biz),
    db.from('pm_furniture').select('id,condition').eq('user_id', biz),
    db.from('dev_projects').select('id,status,total_budget').eq('user_id', biz),
    db.from('properties').select('id,is_bookable').eq('user_id', biz),
    db.from('pm_right_to_rent_checks').select('status,recheck_date').eq('user_id', biz),
    db.from('pm_hmo_rooms').select('id,licence_expiry').eq('user_id', biz),
    db.from('pm_inspections').select('status,scheduled_date').eq('user_id', biz),
    db.from('pm_inventories').select('status').eq('user_id', biz),
    db.from('pm_keys').select('id').eq('user_id', biz),
    db.from('pm_utilities').select('monthly_amount,next_bill_date').eq('user_id', biz),
    db.from('pm_documents').select('id').eq('user_id', biz),
    db.from('company_documents').select('category').eq('user_id', biz),
    db.from('pm_audit_log').select('id,created_at').eq('user_id', biz).gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()),
    db.from('office_expenses').select('amount,date').eq('user_id', biz),
    db.from('pm_bank_accounts').select('balance,currency').eq('user_id', biz),
    db.from('pm_mortgages').select('id').eq('user_id', biz),
    db.from('estate_mortgages').select('id').eq('user_id', biz),
    db.from('pm_compliance').select('expiry_date').eq('user_id', biz),
    db.from('estate_compliance').select('expiry_date').eq('user_id', biz),
    db.from('str_compliance').select('expiry_date').eq('user_id', biz),
    db.from('dev_compliance').select('expiry_date').eq('user_id', biz),
  ])

  const u = (units.data ?? []) as any[]
  const tn = (tenants.data ?? []) as any[]
  const rt = (rtr.data ?? []) as any[]
  const hm = (hmo.data ?? []) as any[]
  const ip = (insp.data ?? []) as any[]
  const iv = (inv.data ?? []) as any[]
  const ut = (utils.data ?? []) as any[]
  const cd = (compDocs.data ?? []) as any[]
  const ex = (expenses.data ?? []) as any[]
  const bk = (banks.data ?? []) as any[]
  const dp = (devs.data ?? []) as any[]
  const pr = (props.data ?? []) as any[]
  const dl = [...(pmComp.data ?? []), ...(estComp.data ?? []), ...(strComp.data ?? []), ...(dev_comp.data ?? [])] as any[]

  return NextResponse.json({
    units: { total: u.length, occupied: u.filter(x => /occupied/i.test(x.status || '')).length },
    buildings: { count: (buildings.data ?? []).length, units: sum(buildings.data ?? [], 'total_units') },
    landlords: { count: (landlords.data ?? []).length, missingBank: (landlords.data ?? []).filter((l: any) => !l.account_number && !l.iban).length },
    tenants: { active: tn.filter(t => /active/i.test(t.status || '')).length, total: tn.length },
    furniture: { items: (furniture.data ?? []).length, poor: (furniture.data ?? []).filter((f: any) => /poor|damage|broken/i.test(f.condition || '')).length },
    renewals: { ending60: u.filter((x: any) => x.lease_end && x.lease_end >= today && x.lease_end <= d90).length },
    developments: { active: dp.filter((p: any) => !/complete|done|closed/i.test(p.status || '')).length, budget: sum(dp, 'total_budget') },
    vacationRentals: { bookable: pr.filter((p: any) => p.is_bookable).length, total: pr.length },
    rightToRent: { due: rt.filter(r => r.recheck_date && r.recheck_date <= d30).length, pending: rt.filter(r => /pending|incomplete/i.test(r.status || '')).length },
    hmo: { rooms: hm.length, licence90: hm.filter(r => r.licence_expiry && r.licence_expiry <= d90).length },
    deadlines: { in30: dl.filter(r => r.expiry_date && r.expiry_date >= today && r.expiry_date <= d30).length, expired: dl.filter(r => r.expiry_date && r.expiry_date < today).length },
    inspections: { next7: ip.filter(r => r.scheduled_date && r.scheduled_date >= today && r.scheduled_date <= d7 && !/done|complete/i.test(r.status || '')).length },
    inventories: { open: iv.filter(r => !/complete|done|signed/i.test(r.status || '')).length },
    keys: { sets: (keys.data ?? []).length },
    utilities: { accounts: ut.length, monthly: sum(ut, 'monthly_amount'), billsNext7: ut.filter(r => r.next_bill_date && r.next_bill_date <= d7).length },
    documents: { property: (pmDocs.data ?? []).length, company: cd.filter(r => !['sop', 'contract_template'].includes(r.category)).length },
    sops: { count: cd.filter(r => r.category === 'sop').length },
    templates: { count: cd.filter(r => r.category === 'contract_template').length },
    audit: { last7: (audit.data ?? []).length },
    expenses: { month: Math.round(ex.filter(r => (r.date || '').slice(0, 7) === month).reduce((a, r) => a + (Number(r.amount) || 0), 0)), count: ex.length },
    banking: { accounts: bk.length, balance: sum(bk.filter(b => b.currency === 'GBP'), 'balance') },
    loans: { count: (mortgages.data ?? []).length + (estMortgages.data ?? []).length },
    reports: { landlords: (landlords.data ?? []).length, properties: pr.length, expenses: ex.length },
  })
}
