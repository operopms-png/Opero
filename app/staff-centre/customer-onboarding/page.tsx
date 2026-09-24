'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'

const ACCENT = '#3B4AFF'

type ChecklistItem = { key: string; label: string; auto: boolean }

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
    key: 'str', label: 'Vacation Rentals', color: '#3B4AFF',
    segments: [
      {
        key: 'str_owner', label: 'Owners', table: 'owner_profiles',
        items: [
          { key: 'intro_call', label: 'Introduction call done', auto: false },
          { key: 'agreement_signed', label: 'Management agreement signed', auto: false },
          { key: 'id_uploaded', label: 'ID document uploaded', auto: false },
          { key: 'compliance_uploaded', label: 'Compliance / insurance documents uploaded', auto: true },
          { key: 'first_payout', label: 'First payout sent', auto: false },
          { key: 'live_on_platforms', label: 'Property live on booking platforms', auto: false },
        ],
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
    key: 'dev', label: 'Developments', color: '#8B5CF6',
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

  async function loadSegment() {
    setLoading(true)
    const uid = accountId!
    const currentMod = moduleInfo(moduleKey)
    const currentSeg = currentMod.segments.find(s => s.key === segmentKey) ?? currentMod.segments[0]

    const { data: rows } = await supabase.from(currentSeg.table).select('*').eq('user_id', uid).order('name', { ascending: true })
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
        custs.forEach((c: any) => {
          const owned: string[] = c.property_ids ?? []
          auto[c.id].compliance_uploaded = owned.some(pid => compliantPropertyIds.has(pid))
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
    if (item.auto) return !!autoDone[customerId]?.[item.key]
    return !!overrides[customerId]?.[item.key]
  }

  async function toggleManual(customerId: string, item: ChecklistItem) {
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
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#101828', letterSpacing: '-0.01em' }}>Customer Onboarding</h1>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#667085' }}>{rows.length} {rows.length === 1 ? 'client' : 'clients'}</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', cursor: 'pointer' }}>
            <input type="checkbox" checked={hideComplete} onChange={e => setHideComplete(e.target.checked)} />
            Hide fully onboarded
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC' }}>No clients here yet</div>
          ) : rows.map(({ customer: c, doneCount, total, complete }) => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: mod.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: mod.color, flexShrink: 0 }}>{(c.name ?? '?').charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#101828' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>{c.email ?? '—'}</div>
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
                      onClick={() => !item.auto && toggleManual(c.id, item)}
                      title={item.auto ? 'Auto-detected from a real record — cannot be ticked by hand' : 'Click to tick/untick'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                        background: done ? '#F0FDF4' : '#FAFAFB', border: '1px solid ' + (done ? '#BBF7D0' : '#F2F4F7'),
                        cursor: item.auto ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? '#10B981' : '#fff', border: '1.5px solid ' + (done ? '#10B981' : '#D0D5DD'), fontSize: 11, color: '#fff', fontWeight: 700,
                      }}>{done ? '✓' : ''}</span>
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
