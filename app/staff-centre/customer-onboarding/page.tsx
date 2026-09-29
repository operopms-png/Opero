'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#A8862E'

type ChecklistItem = { key: string; label: string; auto: boolean }

// Same 10 steps the owner sees in their portal (Owner Portal -> Property Onboarding).
// Progress is stored as a number on the property (properties.staging_stage = steps done, in order).
const PROPERTY_STEPS = [
  'Property virtually viewed and confirmed',
  'Management agreement signed',
  'Fees, rent and deposit sent to Sangsters Group',
  'Offer accepted or rejected by landlord',
  'Contract viewed and signed',
  'Rent and deposit sent to broker',
  'Furnishing the property',
  'Cleaning the property',
  'Pictures of the property',
  'Going live on all travel booking platforms',
]
const PROPERTY_ITEMS: ChecklistItem[] = PROPERTY_STEPS.map((label, i) => ({ key: 'step_' + i, label, auto: false }))

type ModuleDef = {
  key: string
  label: string
  color: string
  segments: {
    key: string
    label: string
    table: string
    items: ChecklistItem[]
  }[]
}

const MODULES: ModuleDef[] = [
  {
    key: 'str', label: 'Vacation Rentals', color: '#A8862E',
    segments: [
      {
        key: 'str_owner', label: 'Client onboarding (owners)', table: 'owner_profiles',
        items: [
          { key: 'intro_call', label: 'Introduction call done', auto: false },
          { key: 'agreement_signed', label: 'Management agreement signed', auto: false },
          { key: 'id_uploaded', label: 'ID document uploaded', auto: false },
          { key: 'compliance_uploaded', label: 'Compliance / insurance documents uploaded', auto: true },
          { key: 'first_payout', label: 'First payout sent', auto: false },
          { key: 'live_on_platforms', label: 'Property live on booking platforms', auto: true },
        ],
      },
      {
        key: 'str_property', label: 'Property onboarding', table: 'properties',
        items: PROPERTY_ITEMS,
      },
    ],
  },
  {
    key: 'pm', label: 'Property Management', color: '#10B981',
    segments: [
      {
        key: 'pm_landlord', label: 'Landlords', table: 'pm_landlords',
        items: [
          { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
          { key: 'agreement_signed', label: 'Management agreement signed', auto: false },
          { key: 'first_payment', label: 'First payment received', auto: true },
          { key: 'certificates_uploaded', label: 'Insurance / certificates uploaded', auto: false },
          { key: 'intro_call', label: 'Introduction call done', auto: false },
        ],
      },
      {
        key: 'pm_tenant', label: 'Tenants', table: 'pm_tenants',
        items: [
          { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
          { key: 'agreement_signed', label: 'Tenancy agreement signed', auto: true },
          { key: 'deposit_protected', label: 'Deposit protected', auto: true },
          { key: 'first_payment', label: 'First rent payment received', auto: false },
          { key: 'move_in_done', label: 'Move-in done', auto: false },
        ],
      },
    ],
  },
  {
    key: 'ea', label: 'Estate Agency', color: '#F59E0B',
    segments: [
      {
        key: 'ea_landlord', label: 'Landlords', table: 'estate_landlords',
        items: [
          { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
          { key: 'agreement_signed', label: 'Agreement signed', auto: false },
          { key: 'first_payment', label: 'First payment received', auto: true },
          { key: 'certificates_uploaded', label: 'Certificates / insurance uploaded', auto: true },
          { key: 'intro_call', label: 'Introduction call done', auto: false },
        ],
      },
      {
        key: 'ea_tenant', label: 'Tenants', table: 'estate_tenants',
        items: [
          { key: 'id_uploaded', label: 'ID document uploaded', auto: true },
          { key: 'agreement_signed', label: 'Tenancy agreement signed', auto: true },
          { key: 'documents_uploaded', label: 'Documents / certificates uploaded', auto: true },
          { key: 'first_payment', label: 'First payment received', auto: false },
          { key: 'move_in_done', label: 'Move-in done', auto: false },
        ],
      },
    ],
  },
  {
    key: 'dev', label: 'Developments', color: '#A8862E',
    segments: [
      {
        key: 'dev_investor', label: 'Off-Plan Buyers / Investors', table: 'dev_investors',
        items: [
          { key: 'intro_call', label: 'Introduction call done', auto: false },
          { key: 'reservation_signed', label: 'Reservation agreement signed', auto: false },
          { key: 'contract_exchanged', label: 'Contract exchanged', auto: false },
          { key: 'deposit_received', label: 'Deposit / investment payment received', auto: false },
          { key: 'documents_provided', label: 'Certificates / documents provided', auto: false },
        ],
      },
    ],
  },
]

function moduleInfo(k: string) { return MODULES.find(m => m.key === k)! }

export default function CustomerOnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string | undefined>()
  const [moduleKey, setModuleKey] = useState(MODULES[0].key)
  const [segmentKey, setSegmentKey] = useState(MODULES[0].segments[0].key)
  const [customers, setCustomers] = useState<any[]>([])
  const [autoDone, setAutoDone] = useState<Record<string, Record<string, boolean>>>({})
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [hideComplete, setHideComplete] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  // Vacation Rentals: clients (owners) and the properties they're linked to
  const [vrProps, setVrProps] = useState<{ id: string; name: string }[]>([])
  const [vrOwners, setVrOwners] = useState<{ id: string; name: string; property_ids: string[] }[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', property_ids: [] as string[] })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [linkError, setLinkError] = useState('')

  const mod = moduleInfo(moduleKey)
  const seg = mod.segments.find(s => s.key === segmentKey) ?? mod.segments[0]

  useEffect(() => { init() }, [])
  useEffect(() => { if (accountId) loadSegment() }, [accountId, moduleKey, segmentKey])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = await getAccountId(user)
    setAccountId(uid)
  }

  async function loadSegment(quiet = false) {
    if (!quiet) setLoading(true)
    const uid = accountId!
    const currentMod = moduleInfo(moduleKey)
    const currentSeg = currentMod.segments.find(s => s.key === segmentKey) ?? currentMod.segments[0]

    if (currentMod.key === 'str') {
      const [{ data: ps }, { data: os }] = await Promise.all([
        supabase.from('properties').select('id, name').eq('user_id', uid).order('name', { ascending: true }),
        supabase.from('owner_profiles').select('id, name, property_ids').eq('business_id', uid).order('name', { ascending: true }),
      ])
      setVrProps((ps ?? []).map((p: any) => ({ id: p.id, name: String(p.name ?? '').trim() || 'Untitled' })))
      setVrOwners((os ?? []).map((o: any) => ({ id: o.id, name: String(o.name ?? '').trim() || 'Unnamed', property_ids: o.property_ids ?? [] })))
    }

    // Property onboarding: one card per property, progress lives on the property itself
    if (currentSeg.key === 'str_property') {
      const [{ data: props }, { data: owners }] = await Promise.all([
        supabase.from('properties').select('id, name, city, location, staging_stage').eq('user_id', uid).order('name', { ascending: true }),
        supabase.from('owner_profiles').select('name, property_ids').eq('business_id', uid),
      ])
      const ownerNames = (pid: string) => (owners ?? []).filter((o: any) => (o.property_ids ?? []).includes(pid)).map((o: any) => String(o.name ?? '').trim()).filter(Boolean)
      setCustomers((props ?? []).map((p: any) => {
        const names = ownerNames(p.id)
        const where = p.city || p.location
        return {
          ...p,
          name: String(p.name ?? '').trim(),
          email: [names.length ? 'Owner: ' + names.join(', ') : 'No owner linked', where].filter(Boolean).join(' · '),
        }
      }))
      setAutoDone({})
      setOverrides({})
      setLoading(false)
      return
    }

    // Owners belong to the business through business_id (their own user_id is their login)
    const ownerCol = currentSeg.table === 'owner_profiles' ? 'business_id' : 'user_id'
    const { data: rows } = await supabase.from(currentSeg.table).select('*').eq(ownerCol, uid).order('name', { ascending: true })
    const custs = rows ?? []
    setCustomers(custs)

    const ids = custs.map((c: any) => c.id)
    const auto: Record<string, Record<string, boolean>> = {}
    custs.forEach((c: any) => { auto[c.id] = {} })

    if (ids.length) {
      if (currentSeg.key === 'str_owner') {
        const allPropertyIds: string[] = custs.flatMap((c: any) => c.property_ids ?? [])
        let compliantPropertyIds = new Set<string>()
        if (allPropertyIds.length) {
          const { data: comp } = await supabase.from('str_compliance').select('property_id').in('property_id', allPropertyIds)
          compliantPropertyIds = new Set((comp ?? []).map((r: any) => r.property_id))
        }
        let liveIds = new Set<string>()
        if (allPropertyIds.length) {
          const { data: props } = await supabase.from('properties').select('id, staging_stage').in('id', allPropertyIds)
          liveIds = new Set((props ?? []).filter((p: any) => (p.staging_stage ?? 0) >= PROPERTY_STEPS.length).map((p: any) => p.id))
        }
        custs.forEach((c: any) => {
          const owned: string[] = c.property_ids ?? []
          auto[c.id].compliance_uploaded = owned.some(pid => compliantPropertyIds.has(pid))
          // Ticks itself once a property finishes Property onboarding (last step: going live)
          auto[c.id].live_on_platforms = owned.some(pid => liveIds.has(pid))
        })
      }

      if (currentSeg.key === 'pm_landlord') {
        custs.forEach((c: any) => { auto[c.id].id_uploaded = !!c.id_url })
        const { data: pays } = await supabase.from('pm_landlord_payments').select('landlord_id,paid_date').in('landlord_id', ids)
        const paidIds = new Set((pays ?? []).filter((p: any) => !!p.paid_date).map((p: any) => p.landlord_id))
        custs.forEach((c: any) => { auto[c.id].first_payment = paidIds.has(c.id) })
      }

      if (currentSeg.key === 'pm_tenant') {
        custs.forEach((c: any) => { auto[c.id].id_uploaded = !!c.id_url })
        const { data: leases } = await supabase.from('pm_leases').select('tenant_id,tenant_signed_at,deposit_protected_date').in('tenant_id', ids)
        const signedIds = new Set((leases ?? []).filter((l: any) => !!l.tenant_signed_at).map((l: any) => l.tenant_id))
        const depositIds = new Set((leases ?? []).filter((l: any) => !!l.deposit_protected_date).map((l: any) => l.tenant_id))
        custs.forEach((c: any) => {
          auto[c.id].agreement_signed = signedIds.has(c.id)
          auto[c.id].deposit_protected = depositIds.has(c.id)
        })
      }

      if (currentSeg.key === 'ea_landlord') {
        custs.forEach((c: any) => { auto[c.id].id_uploaded = !!c.id_url })
        const { data: pays } = await supabase.from('estate_landlord_payments').select('landlord_id,paid_date').in('landlord_id', ids)
        const paidIds = new Set((pays ?? []).filter((p: any) => !!p.paid_date).map((p: any) => p.landlord_id))
        const { data: docs } = await supabase.from('estate_documents').select('landlord_id').in('landlord_id', ids)
        const docIds = new Set((docs ?? []).map((d: any) => d.landlord_id))
        custs.forEach((c: any) => {
          auto[c.id].first_payment = paidIds.has(c.id)
          auto[c.id].certificates_uploaded = docIds.has(c.id)
        })
      }

      if (currentSeg.key === 'ea_tenant') {
        custs.forEach((c: any) => { auto[c.id].id_uploaded = !!c.id_url })
        const { data: tenancies } = await supabase.from('estate_tenancies').select('tenant_id,tenant_signed_at').in('tenant_id', ids)
        const signedIds = new Set((tenancies ?? []).filter((t: any) => !!t.tenant_signed_at).map((t: any) => t.tenant_id))
        const { data: docs } = await supabase.from('estate_documents').select('tenant_id').in('tenant_id', ids)
        const docIds = new Set((docs ?? []).map((d: any) => d.tenant_id))
        custs.forEach((c: any) => {
          auto[c.id].agreement_signed = signedIds.has(c.id)
          auto[c.id].documents_uploaded = docIds.has(c.id)
        })
      }
    }
    setAutoDone(auto)

    const ov: Record<string, Record<string, boolean>> = {}
    custs.forEach((c: any) => { ov[c.id] = {} })
    if (ids.length) {
      const { data: overrideRows } = await supabase.from('onboarding_overrides').select('customer_id,item_key,done').eq('module', currentSeg.key).in('customer_id', ids)
      ;(overrideRows ?? []).forEach((r: any) => {
        if (!ov[r.customer_id]) ov[r.customer_id] = {}
        ov[r.customer_id][r.item_key] = r.done
      })
    }
    setOverrides(ov)

    setLoading(false)
  }

  function isDone(customerId: string, item: ChecklistItem): boolean {
    if (seg.key === 'str_property') {
      const p = customers.find(c => c.id === customerId)
      return Number(item.key.slice(5)) < (p?.staging_stage ?? 0)
    }
    if (item.auto) return !!autoDone[customerId]?.[item.key]
    return !!overrides[customerId]?.[item.key]
  }

  // Property steps go in order: ticking step 5 completes 1–5; unticking step 3 leaves 1–2 done.
  // Same rule as the owner portal, so both always show the same progress.
  async function toggleStep(propertyId: string, item: ChecklistItem) {
    const i = Number(item.key.slice(5))
    const p = customers.find(c => c.id === propertyId)
    const prev = p?.staging_stage ?? 0
    const next = i < prev ? i : i + 1
    setSaving(propertyId + item.key)
    setCustomers(cs => cs.map(c => c.id === propertyId ? { ...c, staging_stage: next } : c))
    const { error } = await supabase.from('properties').update({ staging_stage: next }).eq('id', propertyId)
    if (error) setCustomers(cs => cs.map(c => c.id === propertyId ? { ...c, staging_stage: prev } : c))
    setSaving(null)
  }

  async function toggleManual(customerId: string, item: ChecklistItem) {
    if (seg.key === 'str_property') return toggleStep(customerId, item)
    if (item.auto) return
    const current = !!overrides[customerId]?.[item.key]
    const next = !current
    setSaving(customerId + item.key)
    setOverrides(prev => ({ ...prev, [customerId]: { ...prev[customerId], [item.key]: next } }))
    await supabase.from('onboarding_overrides').upsert({
      user_id: accountId,
      module: seg.key,
      customer_id: customerId,
      item_key: item.key,
      done: next,
      done_at: next ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'module,customer_id,item_key' })
    setSaving(null)
  }

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  // Link a property to a client (or unlink with ownerId null). One client per property.
  async function linkProperty(propertyId: string, ownerId: string | null) {
    setLinkError('')
    setSaving('link' + propertyId)
    const res = await fetch('/api/admin/assign-property', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ property_id: propertyId, owner_id: ownerId }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) setLinkError(d.error || 'Could not link the property')
    await loadSegment(true)
    setSaving(null)
  }

  async function addClient() {
    setAddError('')
    const f = addForm
    if (!f.first_name.trim() || !f.email.trim()) { setAddError('Add at least a first name and email.'); return }
    if (f.password.length < 6) { setAddError('The password must be at least 6 characters.'); return }
    setAdding(true)
    const res = await fetch('/api/create-owner', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ ...f, email: f.email.trim() }) })
    const d = await res.json().catch(() => ({}))
    setAdding(false)
    if (!res.ok) { setAddError(d.error || 'Could not add the client'); return }
    setShowAdd(false)
    setAddForm({ first_name: '', last_name: '', email: '', phone: '', password: '', property_ids: [] })
    await loadSegment(true)
  }

  const rows = useMemo(() => {
    return customers.map(c => {
      const doneCount = seg.items.filter(item => isDone(c.id, item)).length
      return { customer: c, doneCount, total: seg.items.length, complete: doneCount === seg.items.length }
    }).filter(r => !hideComplete || !r.complete)
  }, [customers, autoDone, overrides, seg, hideComplete])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", color: '#98A2B3' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '40px 48px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Staff Centre</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#323338', letterSpacing: '-0.01em' }}>Customer Onboarding</h1>
          <div style={{ fontSize: 14, color: '#667085', maxWidth: 720, lineHeight: 1.5 }}>
            One checklist per client across every module. Items with a tick icon (●) auto-complete from real records — an uploaded ID, a signed agreement, a logged payment. Everything else is ticked by hand and saved here.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {MODULES.map(m => {
            const active = m.key === moduleKey
            return (
              <button key={m.key} onClick={() => { setModuleKey(m.key); setSegmentKey(m.segments[0].key) }} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid ' + (active ? m.color : '#E4E7EC'), background: active ? m.color : '#fff', color: active ? '#fff' : '#344054', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{m.label}</button>
            )
          })}
        </div>

        {mod.segments.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {mod.segments.map(s => {
              const active = s.key === segmentKey
              return (
                <button key={s.key} onClick={() => setSegmentKey(s.key)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid ' + (active ? mod.color : '#E4E7EC'), background: active ? mod.color + '14' : '#fff', color: active ? mod.color : '#667085', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{s.label}</button>
              )
            })}
          </div>
        )}

        {mod.key === 'str' && showAdd && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + ACCENT, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#323338', marginBottom: 4 }}>Add a client</div>
            <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 14 }}>Creates their owner portal login and links them to their property. They can sign in straight away with this email and password.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>First name *</label><input style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }} value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Last name</label><input style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }} value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Email *</label><input style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }} type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Phone</label><input style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }} value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Portal password * (min 6)</label><input style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, background: '#fff' }} type="text" autoComplete="off" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 4, display: 'block' }}>Property</label>
              {vrProps.length === 0 ? <div style={{ fontSize: 12.5, color: '#98A2B3' }}>No properties yet. Add one in Vacation Rentals first.</div> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {vrProps.map(p => {
                    const on = addForm.property_ids.includes(p.id)
                    const current = vrOwners.find(o => o.property_ids.includes(p.id))
                    return (
                      <button key={p.id} type="button" onClick={() => setAddForm({ ...addForm, property_ids: on ? addForm.property_ids.filter(x => x !== p.id) : [...addForm.property_ids, p.id] })}
                        title={current ? `Currently linked to ${current.name}. Choosing it moves it to the new client.` : undefined}
                        style={{ padding: '7px 12px', borderRadius: 20, border: '1px solid ' + (on ? ACCENT : '#D0D5DD'), background: on ? '#FBF4E6' : '#fff', color: on ? ACCENT : '#344054', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {on ? '✓ ' : ''}{p.name}{current ? <span style={{ fontWeight: 400, color: '#98A2B3' }}> · {current.name}</span> : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {addError && <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 12 }}>{addError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={addClient} disabled={adding} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: adding ? 0.6 : 1 }}>{adding ? 'Adding…' : 'Add client'}</button>
              <button onClick={() => { setShowAdd(false); setAddError('') }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D0D5DD', background: '#fff', color: '#344054', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        )}
        {linkError && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 10, padding: '9px 14px', fontSize: 13, marginBottom: 12 }}>{linkError}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#667085' }}>{rows.length} {seg.key === 'str_property' ? (rows.length === 1 ? 'property' : 'properties') : (rows.length === 1 ? 'client' : 'clients')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', cursor: 'pointer' }}>
              <input type="checkbox" checked={hideComplete} onChange={e => setHideComplete(e.target.checked)} />
              Hide fully onboarded
            </label>
            {mod.key === 'str' && !showAdd && (
              <button onClick={() => { setShowAdd(true); setAddError('') }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add client</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC' }}>{seg.key === 'str_property' ? 'No properties yet' : 'No clients here yet'}</div>
          ) : seg.key === 'str_property' ? rows.map(({ customer: c }) => {
            // Same layout as the owner portal's Property Onboarding page
            const stage = Math.min(c.staging_stage ?? 0, PROPERTY_STEPS.length)
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EAECF0', padding: '22px 24px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#323338' }}>{c.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#667085' }}>Client:</span>
                      <select
                        value={vrOwners.find(o => o.property_ids.includes(c.id))?.id ?? ''}
                        disabled={saving === 'link' + c.id}
                        onChange={e => linkProperty(c.id, e.target.value || null)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #D0D5DD', background: '#fff', color: '#323338', fontFamily: 'inherit', cursor: 'pointer' }}
                      >
                        <option value="">No client linked</option>
                        {vrOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      {(c.city || c.location) && <span style={{ fontSize: 12, color: '#98A2B3' }}>· {c.city || c.location}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>{stage} of {PROPERTY_STEPS.length} complete</div>
                </div>
                <div style={{ height: 6, background: '#F2F4F7', borderRadius: 3, margin: '10px 0 16px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(stage / PROPERTY_STEPS.length) * 100}%`, background: '#A8862E', transition: 'width .2s' }} />
                </div>
                {PROPERTY_ITEMS.map((item, i) => {
                  const done = i < stage
                  const current = i === stage
                  const busy = saving === c.id + item.key
                  return (
                    <div key={item.key} onClick={() => toggleStep(c.id, item)} title="Click to tick this step (and every step before it). Click a ticked step to untick it." style={{ display: 'flex', gap: 12, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700,
                          background: done ? '#10B981' : current ? '#FBF4E6' : '#F2F4F7',
                          color: done ? '#fff' : current ? '#A8862E' : '#98A2B3',
                          border: current ? '1px solid #A8862E' : 'none',
                        }}>{done ? '✓' : i + 1}</div>
                        {i < PROPERTY_ITEMS.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 16, background: '#EAECF0' }} />}
                      </div>
                      <div style={{ paddingBottom: 14, paddingTop: 3, fontSize: 13, color: done || current ? '#323338' : '#667085' }}>{item.label}</div>
                    </div>
                  )
                })}
              </div>
            )
          }) : rows.map(({ customer: c, doneCount, total, complete }) => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: mod.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: mod.color, flexShrink: 0 }}>{(c.name ?? '?').charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#323338' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>{c.email ?? '—'}</div>
                  {seg.key === 'str_owner' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {(c.property_ids ?? []).map((pid: string) => {
                        const p = vrProps.find(x => x.id === pid)
                        if (!p) return null
                        return (
                          <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#A8862E', background: '#FBF4E6', borderRadius: 14, padding: '4px 6px 4px 10px' }}>
                            {p.name}
                            <button title="Unlink this property" disabled={saving === 'link' + pid} onClick={() => linkProperty(pid, null)} style={{ border: 'none', background: 'none', color: '#A8862E', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        )
                      })}
                      {vrProps.some(p => !(c.property_ids ?? []).includes(p.id)) && (
                        <select value="" onChange={e => e.target.value && linkProperty(e.target.value, c.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 14, border: '1px dashed #98A2B3', background: '#fff', color: '#344054', fontFamily: 'inherit', cursor: 'pointer' }}>
                          <option value="">+ Link property</option>
                          {vrProps.filter(p => !(c.property_ids ?? []).includes(p.id)).map(p => {
                            const cur = vrOwners.find(o => o.property_ids.includes(p.id))
                            return <option key={p.id} value={p.id}>{p.name}{cur ? ` (moves from ${cur.name})` : ''}</option>
                          })}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: complete ? '#10B981' : '#667085', marginBottom: 4 }}>{doneCount} of {total} complete</div>
                  <div style={{ width: 120, height: 6, borderRadius: 4, background: '#F2F4F7', overflow: 'hidden' }}>
                    <div style={{ width: `${total ? (doneCount / total) * 100 : 0}%`, height: '100%', background: complete ? '#10B981' : mod.color }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {seg.items.map(item => {
                  const done = isDone(c.id, item)
                  const busy = saving === c.id + item.key
                  return (
                    <div
                      key={item.key}
                      onClick={() => (seg.key === 'str_property' || !item.auto) && toggleManual(c.id, item)}
                      title={seg.key === 'str_property' ? 'Steps go in order: clicking a step ticks every step before it too. The owner sees the same progress in their portal.' : item.auto ? 'Auto-detected from a real record — cannot be ticked by hand' : 'Click to tick/untick'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                        background: done ? '#F0FDF4' : '#FAFAFB', border: '1px solid ' + (done ? '#BBF7D0' : '#F2F4F7'),
                        cursor: item.auto ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? '#10B981' : '#fff', border: '1.5px solid ' + (done ? '#10B981' : '#D0D5DD'), fontSize: 11, color: '#fff', fontWeight: 700,
                      }}>{done ? '✓' : seg.key === 'str_property' ? <span style={{ color: '#98A2B3', fontSize: 10 }}>{Number(item.key.slice(5)) + 1}</span> : ''}</span>
                      <span style={{ fontSize: 12.5, color: done ? '#065F46' : '#344054', flex: 1 }}>{item.label}</span>
                      {item.auto && <span style={{ fontSize: 9, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
