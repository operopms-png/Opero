'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { C, MODULE_COLOR, CrmPage, CrmHeader, Body, Pill, Avatar, Group, Row, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'


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
    key: 'str', label: 'Vacation Rentals', color: MODULE_COLOR.str,
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
    key: 'pm', label: 'Property Management', color: MODULE_COLOR.pm,
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
    key: 'ea', label: 'Estate Agency', color: MODULE_COLOR.ea,
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
    key: 'dev', label: 'Developments', color: MODULE_COLOR.dev,
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

  if (loading) return <Loading />

  const isProp = seg.key === 'str_property'
  const noun = isProp ? 'property' : 'client'
  const extraCol = seg.key === 'str_owner' ? [{ k: 'x', l: 'Properties', w: 240 }] : isProp ? [{ k: 'x', l: 'Client', w: 190 }] : []
  const cols = [
    { k: 'n', l: isProp ? 'Property' : 'Client', w: 'minmax(230px,1fr)' },
    ...extraCol,
    { k: 'p', l: 'Progress', w: 150 },
    ...seg.items.map((it, i) => ({ k: it.key, l: <span title={it.label} style={{ fontSize: 12 }}>{isProp ? `${i + 1}. ` : ''}{it.label}{it.auto ? <span style={{ color: C.faint }}> · auto</span> : null}</span>, w: 118 })),
  ]
  const inProgress = rows.filter(r => !r.complete)
  const done = rows.filter(r => r.complete)

  function Tick({ c, item, i }: { c: any; item: ChecklistItem; i: number }) {
    const d = isDone(c.id, item)
    const busy = saving === c.id + item.key
    const stage = isProp ? Math.min(c.staging_stage ?? 0, PROPERTY_STEPS.length) : -1
    const next = isProp && i === stage
    const clickable = isProp || !item.auto
    const color = d ? C.green : next ? C.orange : item.auto ? '#EEF0F4' : C.grey
    return (
      <div onClick={() => clickable && toggleManual(c.id, item)}
        title={isProp ? 'Steps go in order: ticking a step ticks every step before it. The owner sees the same progress in their portal.' : item.auto ? 'Ticks itself from a real record — cannot be ticked by hand' : 'Click to tick / untick'}
        style={{ width: '100%', height: 30, borderRadius: 4, background: color, color: d || next ? '#fff' : item.auto ? C.faint : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 500, cursor: clickable ? 'pointer' : 'default', opacity: busy ? 0.6 : 1, userSelect: 'none' }}>
        {d ? '✓ Done' : next ? 'Up next' : item.auto ? 'Auto' : ''}
      </div>
    )
  }

  function rowCells(c: any, doneCount: number, total: number, complete: boolean) {
    const extra: React.ReactNode[] = []
    if (seg.key === 'str_owner') extra.push(
      <div key="x" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
        {(c.property_ids ?? []).map((pid: string) => {
          const p = vrProps.find(x => x.id === pid)
          if (!p) return null
          return (
            <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: C.gold, borderRadius: 4, padding: '3px 4px 3px 8px', maxWidth: 170 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button title="Unlink this property" disabled={saving === 'link' + pid} onClick={() => linkProperty(pid, null)} style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          )
        })}
        {vrProps.some(p => !(c.property_ids ?? []).includes(p.id)) && (
          <select value="" onChange={e => e.target.value && linkProperty(e.target.value, c.id)} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, border: '1px dashed ' + C.border, background: '#fff', color: C.muted, fontFamily: 'inherit', cursor: 'pointer', maxWidth: 120 }}>
            <option value="">+ Link</option>
            {vrProps.filter(p => !(c.property_ids ?? []).includes(p.id)).map(p => {
              const cur = vrOwners.find(o => o.property_ids.includes(p.id))
              return <option key={p.id} value={p.id}>{p.name}{cur ? ` (moves from ${cur.name})` : ''}</option>
            })}
          </select>
        )}
      </div>
    )
    if (isProp) extra.push(
      <select key="x" value={vrOwners.find(o => o.property_ids.includes(c.id))?.id ?? ''} disabled={saving === 'link' + c.id} onChange={e => linkProperty(c.id, e.target.value || null)}
        style={{ width: '100%', fontSize: 13, padding: '5px 6px', borderRadius: 4, border: '1px solid ' + C.row, background: '#fff', color: C.ink, fontFamily: 'inherit', cursor: 'pointer' }}>
        <option value="">No client linked</option>
        {vrOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    )
    const pct = total ? Math.round(doneCount / total * 100) : 0
    return [
      <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar name={c.name || '?'} color={mod.color} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || 'Untitled'}</div>
          <div style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isProp ? (c.city || c.location || '—') : (c.email ?? '—')}</div>
        </div>
      </div>,
      ...extra,
      <div key="p" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 3 }}><span>{doneCount} of {total}</span><span>{pct}%</span></div>
        <div style={{ height: 6, background: C.row, borderRadius: 3, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: complete ? C.green : C.gold }} /></div>
      </div>,
      ...seg.items.map((item, i) => Tick({ c, item, i })),
    ]
  }

  const f = (k: keyof typeof addForm) => (e: any) => setAddForm({ ...addForm, [k]: e.target.value })

  return (
    <CrmPage>
      <CrmHeader
        title="Customer Onboarding"
        subtitle="One checklist per client across every module. Steps marked auto tick themselves from real records — an uploaded ID, a signed agreement, a logged payment. Everything else is ticked by hand."
        actions={mod.key === 'str' ? <button onClick={() => { setShowAdd(true); setAddError('') }} style={btn('gold')}>+ Add client</button> : undefined}
        tabs={MODULES.map(m => ({ k: m.key, l: m.label, color: m.color }))}
        tab={moduleKey} onTab={k => { setModuleKey(k); setSegmentKey(moduleInfo(k).segments[0].key) }}
      />
      <Body>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {mod.segments.length > 1 && (
            <div style={{ display: 'inline-flex', border: '1px solid ' + C.border, borderRadius: 4, overflow: 'hidden' }}>
              {mod.segments.map((sg, i) => {
                const on = sg.key === segmentKey
                return <button key={sg.key} onClick={() => setSegmentKey(sg.key)} style={{ padding: '7px 14px', border: 'none', borderLeft: i ? '1px solid ' + C.border : 'none', background: on ? C.cream : '#fff', color: on ? C.brown : C.muted, fontSize: 13, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{sg.label}</button>
              })}
            </div>
          )}
          <span style={{ fontSize: 13, color: C.muted }}>{rows.length} {rows.length === 1 ? noun : isProp ? 'properties' : 'clients'}</span>
          <div style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideComplete} onChange={e => setHideComplete(e.target.checked)} style={{ accentColor: C.goldDark }} />
            Hide fully onboarded
          </label>
        </div>

        {linkError && <div style={{ background: '#FDE8EC', border: '1px solid #F5B5C1', color: C.red, borderRadius: 4, padding: '9px 14px', fontSize: 13, marginBottom: 14 }}>{linkError}</div>}

        {rows.length === 0 && done.length === 0 ? <Empty>{isProp ? 'No properties yet.' : hideComplete && customers.length ? 'Everyone here is fully onboarded.' : 'No clients here yet.'}</Empty> : (
          <>
            <Group title="In progress" color={C.orange} count={inProgress.length} cols={cols}>
              {inProgress.length === 0 && <Row cells={[<span key="e" style={{ color: C.faint, fontSize: 13 }}>Nothing in progress</span>, ...cols.slice(1).map(() => '')]} />}
              {inProgress.map(({ customer: c, doneCount, total, complete }) => <Row key={c.id} cells={rowCells(c, doneCount, total, complete)} />)}
            </Group>
            {!hideComplete && done.length > 0 && (
              <Group title="Fully onboarded" color={C.green} count={done.length} cols={cols}>
                {done.map(({ customer: c, doneCount, total, complete }) => <Row key={c.id} cells={rowCells(c, doneCount, total, complete)} />)}
              </Group>
            )}
          </>
        )}
      </Body>

      {mod.key === 'str' && showAdd && (
        <Modal title="Add a client" width={620} onClose={() => { setShowAdd(false); setAddError('') }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Creates their owner portal login and links them to their property. They can sign in straight away with this email and password.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>First name *</label><input style={inp} value={addForm.first_name} onChange={f('first_name')} /></div>
            <div><label style={lbl}>Last name</label><input style={inp} value={addForm.last_name} onChange={f('last_name')} /></div>
            <div><label style={lbl}>Email *</label><input style={inp} type="email" value={addForm.email} onChange={f('email')} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={addForm.phone} onChange={f('phone')} /></div>
            <div><label style={lbl}>Portal password * (min 6)</label><input style={inp} type="text" autoComplete="off" value={addForm.password} onChange={f('password')} /></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={lbl}>Property</label>
            {vrProps.length === 0 ? <div style={{ fontSize: 13, color: C.faint }}>No properties yet. Add one in Vacation Rentals first.</div> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {vrProps.map(p => {
                  const on = addForm.property_ids.includes(p.id)
                  const current = vrOwners.find(o => o.property_ids.includes(p.id))
                  return (
                    <button key={p.id} type="button" onClick={() => setAddForm({ ...addForm, property_ids: on ? addForm.property_ids.filter(x => x !== p.id) : [...addForm.property_ids, p.id] })}
                      title={current ? `Currently linked to ${current.name}. Choosing it moves it to the new client.` : undefined}
                      style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid ' + (on ? C.gold : C.border), background: on ? C.gold : '#fff', color: on ? '#fff' : C.ink, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {on ? '✓ ' : ''}{p.name}{current ? <span style={{ opacity: 0.7 }}> · {current.name}</span> : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {addError && <div style={{ fontSize: 13, color: C.red, marginTop: 12 }}>{addError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowAdd(false); setAddError('') }} style={btn('ghost')}>Cancel</button>
            <button onClick={addClient} disabled={adding} style={{ ...btn('gold'), opacity: adding ? 0.6 : 1 }}>{adding ? 'Adding…' : 'Add client'}</button>
          </div>
        </Modal>
      )}
    </CrmPage>
  )
}
