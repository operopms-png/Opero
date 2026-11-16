// Client onboarding checklists: the steps for each kind of client, and which of them tick themselves from real records.
// Shared by Customer Onboarding (platform owner's checklist page) and the Onboarding tracker (staff board), so both
// always agree. Manual ticks live in onboarding_overrides (module = segment key, item_key = step key).
//   auto   = ticks itself from a real record and cannot be unticked by hand
//   hybrid = ticks itself when the record exists, and staff can also tick it by hand (for example a contract signed on paper)

export type Item = { key: string; label: string; auto: boolean; hybrid?: boolean }
export type Segment = { key: string; label: string; table: string; items: Item[] }
export type ModuleBase = { key: string; label: string; segments: Segment[] }

export const PROPERTY_STEPS = [
  'Property virtually viewed and confirmed',
  'Management agreement signed',
  'Fees, rent and deposit sent to the property manager',
  'Offer accepted or rejected by landlord',
  'Contract viewed and signed',
  'Rent and deposit sent to broker',
  'Furnishing the property',
  'Cleaning the property',
  'Pictures of the property',
  'Going live on all travel booking platforms',
]
export const PROPERTY_ITEMS: Item[] = PROPERTY_STEPS.map((label, i) => ({ key: 'step_' + i, label, auto: false }))

export const MODULES_BASE: ModuleBase[] = [
  { key: 'str', label: 'Vacation Rentals', segments: [
    { key: 'str_owner', label: 'Client onboarding (owners)', table: 'owner_profiles', items: [
      { key: 'intro_call', label: 'Introduction call done', auto: false },
      { key: 'agreement_signed', label: 'Management agreement signed', auto: true, hybrid: true },
      { key: 'id_uploaded', label: 'ID document uploaded', auto: false },
      { key: 'compliance_uploaded', label: 'Compliance / insurance documents uploaded', auto: true },
      { key: 'first_payout', label: 'First payout sent', auto: false },
      { key: 'live_on_platforms', label: 'Property live on booking platforms', auto: true },
    ] },
    { key: 'str_cohost', label: 'Co-hosts', table: 'cohosts', items: [
      { key: 'details_added', label: 'Contact details and address added', auto: true },
      { key: 'agreement_signed', label: 'Co-host agreement signed', auto: true, hybrid: true },
      { key: 'portal_access', label: 'Portal login created', auto: true },
      { key: 'onboarded', label: 'Marked as onboarded', auto: true },
    ] },
    { key: 'str_property', label: 'Property onboarding', table: 'properties', items: PROPERTY_ITEMS },
  ] },
  { key: 'pm', label: 'Property Management', segments: [
    { key: 'pm_landlord', label: 'Landlords', table: 'pm_landlords', items: [
      { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
      { key: 'agreement_signed', label: 'Management agreement signed', auto: true, hybrid: true },
      { key: 'first_payment', label: 'First payment received', auto: true },
      { key: 'certificates_uploaded', label: 'Insurance / certificates uploaded', auto: false },
      { key: 'intro_call', label: 'Introduction call done', auto: false },
    ] },
    { key: 'pm_tenant', label: 'Tenants', table: 'pm_tenants', items: [
      { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
      { key: 'agreement_signed', label: 'Tenancy agreement signed', auto: true },
      { key: 'deposit_protected', label: 'Deposit protected', auto: true },
      { key: 'first_payment', label: 'First rent payment received', auto: true, hybrid: true },
      { key: 'move_in_done', label: 'Move-in done', auto: true, hybrid: true },
    ] },
  ] },
  { key: 'ea', label: 'Estate Agency', segments: [
    { key: 'ea_landlord', label: 'Landlords', table: 'estate_landlords', items: [
      { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
      { key: 'agreement_signed', label: 'Agreement signed', auto: true, hybrid: true },
      { key: 'first_payment', label: 'First payment received', auto: true },
      { key: 'certificates_uploaded', label: 'Certificates / insurance uploaded', auto: true },
      { key: 'intro_call', label: 'Introduction call done', auto: false },
    ] },
    { key: 'ea_tenant', label: 'Tenants', table: 'estate_tenants', items: [
      { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
      { key: 'agreement_signed', label: 'Tenancy agreement signed', auto: true },
      { key: 'documents_uploaded', label: 'Documents / certificates uploaded', auto: true },
      { key: 'first_payment', label: 'First payment received', auto: false },
      { key: 'move_in_done', label: 'Move-in done', auto: false },
    ] },
  ] },
  { key: 'dev', label: 'Developments', segments: [
    { key: 'dev_investor', label: 'Off-Plan Buyers / Investors', table: 'dev_investors', items: [
      { key: 'intro_call', label: 'Introduction call done', auto: false },
      { key: 'reservation_signed', label: 'Reservation agreement signed', auto: true, hybrid: true },
      { key: 'contract_exchanged', label: 'Contract exchanged', auto: false },
      { key: 'deposit_received', label: 'Deposit / investment payment received', auto: false },
      { key: 'documents_provided', label: 'Certificates / documents provided', auto: false },
    ] },
  ] },
]

export const ALL_SEGMENTS: (Segment & { module: string; moduleLabel: string })[] = MODULES_BASE.flatMap(m => m.segments.map(s => ({ ...s, module: m.key, moduleLabel: m.label })))
export const segmentByKey = (k: string) => ALL_SEGMENTS.find(s => s.key === k)
// Owners belong to the business through business_id; every other client table uses user_id
export const ownerCol = (seg: { table: string }) => seg.table === 'owner_profiles' ? 'business_id' : 'user_id'
// Segments that are people (the tracker follows these; property onboarding is tracked on the property itself)
export const PERSON_SEGMENTS = ALL_SEGMENTS.filter(s => s.key !== 'str_property')
// Which onboarding link kind/module creates which kind of client
export const LINK_SEGMENT: Record<string, string> = { 'owner/pm': 'pm_landlord', 'owner/ea': 'ea_landlord', 'owner/str': 'str_owner', 'tenant/pm': 'pm_tenant', 'tenant/ea': 'ea_tenant', 'cohost/str': 'str_cohost' }

export type AutoMap = Record<string, Record<string, boolean>>
export type OverrideMap = Record<string, Record<string, boolean>>

export function itemDone(item: Item, auto: Record<string, boolean> | undefined, ov: Record<string, boolean> | undefined): boolean {
  if (item.hybrid) return !!auto?.[item.key] || !!ov?.[item.key]
  if (item.auto) return !!auto?.[item.key]
  return !!ov?.[item.key]
}
// Can staff tick this step by hand right now?
export const itemEditable = (item: Item, auto: Record<string, boolean> | undefined) => item.hybrid ? !auto?.[item.key] : !item.auto

const toSet = (rows: any[] | null | undefined, k: string) => new Set((rows ?? []).filter(r => r[k]).map((r: any) => r[k]))

/** Works out which automatic steps are done for these clients, from real records. `db` is any Supabase client. */
export async function computeAuto(db: any, segKey: string, custs: any[]): Promise<AutoMap> {
  const auto: AutoMap = {}
  custs.forEach(c => { auto[c.id] = {} })
  const ids = custs.map(c => c.id)
  if (!ids.length || segKey === 'str_property') return auto
  const today = new Date().toISOString().slice(0, 10)

  // A contract sent from Documents and signed by the person
  if (['str_owner', 'str_cohost', 'pm_landlord', 'ea_landlord', 'dev_investor'].includes(segKey)) {
    const { data: signed } = await db.from('doc_sends').select('person_id, signed_at').in('person_id', ids).not('signed_at', 'is', null)
    const s = toSet(signed, 'person_id')
    const key = segKey === 'dev_investor' ? 'reservation_signed' : 'agreement_signed'
    custs.forEach(c => { auto[c.id][key] = s.has(c.id) })
  }

  if (segKey === 'str_owner') {
    const allPropertyIds: string[] = custs.flatMap(c => c.property_ids ?? [])
    let compliant = new Set<string>(), live = new Set<string>()
    if (allPropertyIds.length) {
      const [{ data: comp }, { data: props }] = await Promise.all([
        db.from('str_compliance').select('property_id').in('property_id', allPropertyIds),
        db.from('properties').select('id, staging_stage').in('id', allPropertyIds),
      ])
      compliant = new Set((comp ?? []).map((r: any) => r.property_id))
      live = new Set((props ?? []).filter((p: any) => (p.staging_stage ?? 0) >= PROPERTY_STEPS.length).map((p: any) => p.id))
    }
    custs.forEach(c => { const owned: string[] = c.property_ids ?? []; auto[c.id].compliance_uploaded = owned.some(p => compliant.has(p)); auto[c.id].live_on_platforms = owned.some(p => live.has(p)) })
  }

  if (segKey === 'str_cohost') {
    custs.forEach(c => {
      auto[c.id].details_added = !!(String(c.phone || '').trim() && String(c.address || '').trim() && String(c.email || '').trim())
      auto[c.id].portal_access = !!c.portal_user_id
      auto[c.id].onboarded = !!c.onboarded_at
    })
  }

  if (segKey === 'pm_landlord') {
    custs.forEach(c => { auto[c.id].id_uploaded = !!c.id_url })
    const { data: pays } = await db.from('pm_landlord_payments').select('landlord_id,paid_date').in('landlord_id', ids)
    const paid = toSet((pays ?? []).filter((p: any) => !!p.paid_date), 'landlord_id')
    custs.forEach(c => { auto[c.id].first_payment = paid.has(c.id) })
  }

  if (segKey === 'pm_tenant') {
    custs.forEach(c => { auto[c.id].id_uploaded = !!c.id_url })
    const [{ data: leases }, { data: rent }] = await Promise.all([
      db.from('pm_leases').select('tenant_id,tenant_signed_at,deposit_protected_date,start_date').in('tenant_id', ids),
      db.from('pm_rent_payments').select('tenant_id,paid_date').in('tenant_id', ids),
    ])
    const signed = toSet((leases ?? []).filter((l: any) => !!l.tenant_signed_at), 'tenant_id')
    const protectedIds = toSet((leases ?? []).filter((l: any) => !!l.deposit_protected_date), 'tenant_id')
    const moved = toSet((leases ?? []).filter((l: any) => !!l.tenant_signed_at && l.start_date && String(l.start_date).slice(0, 10) <= today), 'tenant_id')
    const paid = toSet((rent ?? []).filter((p: any) => !!p.paid_date), 'tenant_id')
    custs.forEach(c => { auto[c.id].agreement_signed = signed.has(c.id); auto[c.id].deposit_protected = protectedIds.has(c.id); auto[c.id].first_payment = paid.has(c.id); auto[c.id].move_in_done = moved.has(c.id) })
  }

  if (segKey === 'ea_landlord') {
    custs.forEach(c => { auto[c.id].id_uploaded = !!c.id_url })
    const [{ data: pays }, { data: docs }] = await Promise.all([
      db.from('estate_landlord_payments').select('landlord_id,paid_date').in('landlord_id', ids),
      db.from('estate_documents').select('landlord_id').in('landlord_id', ids),
    ])
    const paid = toSet((pays ?? []).filter((p: any) => !!p.paid_date), 'landlord_id'), docIds = toSet(docs, 'landlord_id')
    custs.forEach(c => { auto[c.id].first_payment = paid.has(c.id); auto[c.id].certificates_uploaded = docIds.has(c.id) })
  }

  if (segKey === 'ea_tenant') {
    custs.forEach(c => { auto[c.id].id_uploaded = !!c.id_url })
    const [{ data: tenancies }, { data: docs }] = await Promise.all([
      db.from('estate_tenancies').select('tenant_id,tenant_signed_at').in('tenant_id', ids),
      db.from('estate_documents').select('tenant_id').in('tenant_id', ids),
    ])
    const signed = toSet((tenancies ?? []).filter((t: any) => !!t.tenant_signed_at), 'tenant_id'), docIds = toSet(docs, 'tenant_id')
    custs.forEach(c => { auto[c.id].agreement_signed = signed.has(c.id); auto[c.id].documents_uploaded = docIds.has(c.id) })
  }
  return auto
}
