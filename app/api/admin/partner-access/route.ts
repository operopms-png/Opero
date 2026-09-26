import { NextRequest, NextResponse } from 'next/server'
import { requireStaffWithBusiness, serviceClient } from '@/lib/admin-auth'

// Sets what an investor partner can see beyond Staff Centre → Partners.
// body: { owner_id, custom_modules } — custom_modules like ['sc', 'sc:crm', 'str']
//
// Partners with nothing extra need no team_members row. As soon as an admin
// grants more, the partner is added to the business's team_members with
// role 'Partner' so the granted pages load the business's data (every page
// resolves the business through team_members). Removing the extras removes
// that row again.

const GRANTABLE_MODULES = ['str', 'pm', 'ea', 'dev']
const GRANTABLE_SC_TABS = [
  'oversight', 'partners', 'investors', 'customeronboarding', 'meetings', 'inbox', 'portalaccess',
  'portals', 'maintenance', 'crm', 'marketing', 'sales', 'applications', 'performance', 'hr',
  'training', 'calendar', 'tasks',
]

export async function POST(req: NextRequest) {
  const staff = await requireStaffWithBusiness(req)
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { owner_id, custom_modules } = await req.json()
  if (!owner_id || !Array.isArray(custom_modules)) {
    return NextResponse.json({ error: 'owner_id and custom_modules are required' }, { status: 400 })
  }

  const { data: owner, error: ownerError } = await serviceClient
    .from('owner_profiles')
    .select('id, user_id, business_id, name, email')
    .eq('id', owner_id)
    .maybeSingle()
  if (ownerError || !owner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  if (owner.business_id && owner.business_id !== staff.businessId) {
    return NextResponse.json({ error: 'This partner belongs to another business' }, { status: 403 })
  }

  // Keep only known values; Partners tab and Staff Centre are always on
  const modules = GRANTABLE_MODULES.filter(m => custom_modules.includes(m))
  const tabs = GRANTABLE_SC_TABS.filter(t => custom_modules.includes(`sc:${t}`) && t !== 'partners')
  const saved = ['sc', 'sc:partners', ...tabs.map(t => `sc:${t}`), ...modules]
  const hasExtras = modules.length > 0 || tabs.length > 0

  const { error: saveError } = await serviceClient
    .from('owner_profiles')
    .update({ custom_modules: saved, business_id: owner.business_id ?? staff.businessId })
    .eq('id', owner.id)
  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

  // The partner's login email (owner_profiles.email can drift from auth)
  let email = owner.email as string | null
  if (owner.user_id) {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(owner.user_id)
    email = authUser?.user?.email ?? email
  }
  if (!email) return NextResponse.json({ error: 'Partner has no login email' }, { status: 400 })

  const { data: existing } = await serviceClient
    .from('team_members')
    .select('id, role, user_id')
    .eq('email', email)

  const staffRow = (existing ?? []).find(r => r.role !== 'Partner')
  if (staffRow) {
    return NextResponse.json({ error: 'This email is already a staff member — manage their access in Team Management instead.' }, { status: 409 })
  }
  const partnerRow = (existing ?? []).find(r => r.role === 'Partner' && r.user_id === staff.businessId)

  if (hasExtras) {
    const row = { user_id: staff.businessId, name: owner.name, email, role: 'Partner', custom_modules: saved, property_ids: [], status: 'Active' }
    const { error } = partnerRow
      ? await serviceClient.from('team_members').update(row).eq('id', partnerRow.id)
      : await serviceClient.from('team_members').insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (partnerRow) {
    const { error } = await serviceClient.from('team_members').delete().eq('id', partnerRow.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, custom_modules: saved })
}
