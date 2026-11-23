'use client'
// Gated Communities: community management for every company, opened from Real Estate Intelligence next to Hotels.
// Dashboard, units, residents, visitors, repairs and complaints are working tabs; every other section of the plan shows its
// feature list as "planned" until it is built (lib/community-sections.ts). Each company sees only its own rows (database policies).
import { useEffect, useState } from 'react'
import ModuleTabStrip from '@/components/ModuleTabStrip'
import RecordTab from '@/components/pm/RecordTab'
import CommunityDashboard from '@/components/community/CommunityDashboard'
import { supabase, getAccountId } from '@/lib/supabase'
import { useRealEstateAccess } from '@/lib/real-estate-access'
import { COMMUNITY_GROUPS, BUILT } from '@/lib/community-sections'
import { COMMUNITY_UNITS, COMMUNITY_RESIDENTS, COMMUNITY_VISITORS, COMMUNITY_MAINTENANCE, COMMUNITY_COMPLAINTS } from '@/lib/community-record-tabs'

const GROUPS = COMMUNITY_GROUPS.map(g => ({ label: g.label, items: g.sections.map(s => s.name) }))
const SECTIONS = COMMUNITY_GROUPS.flatMap(g => g.sections)
const CFG: Record<string, any> = {
  'Property & Unit Management': COMMUNITY_UNITS, 'Homeowner & Resident Management': COMMUNITY_RESIDENTS, 'Visitor Management': COMMUNITY_VISITORS,
  'Maintenance & Repairs': COMMUNITY_MAINTENANCE, 'Complaints & Resident Relations': COMMUNITY_COMPLAINTS,
}

export default function CommunityPage() {
  const access = useRealEstateAccess()
  const [tab, setTab] = useState('Dashboard')
  const [acct, setAcct] = useState('')
  const [units, setUnits] = useState<any[]>([])
  useEffect(() => {
    if (!access || access === 'none') return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const id = await getAccountId(user)
      setAcct(id)
      const { data } = await supabase.from('community_units').select('id,name').eq('user_id', id)
      setUnits(data ?? [])
    })()
  }, [access, tab])
  if (access === null) return <div style={{ padding: 24, color: '#667085' }}>Loading…</div>
  if (access === 'none') return <div style={{ padding: 32, color: '#475467' }}>You do not have access to this page. Ask an admin.</div>
  const ro = access === 'view'
  const sec = SECTIONS.find(s => s.name === tab)!
  return (
    <div>
      <ModuleTabStrip module="community" current={tab} groups={GROUPS} onSelect={setTab} />
      <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid #C9DEF3' }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: '#1D4E89', margin: '0 0 2px' }}>{tab}</h1>
        <div style={{ fontSize: 13, color: '#4A6F98', maxWidth: 760, lineHeight: 1.5 }}>{sec.blurb}{ro ? ' You have view only access.' : ''}</div>
      </div>
      {tab === 'Dashboard' && <CommunityDashboard userId={acct} go={setTab} />}
      {CFG[tab] && <RecordTab key={tab} cfg={CFG[tab]} userId={acct} properties={units} readOnly={ro} />}
      {!BUILT.includes(tab) && (
        <div style={{ padding: 28 }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '22px 24px', maxWidth: 760 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#B54708' }}>Planned, not built yet</div>
            <div style={{ fontSize: 14, color: '#475467', lineHeight: 1.6, margin: '6px 0 14px' }}>This section will cover:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sec.features.map(f => <span key={f} style={{ background: '#F2F6FC', border: '1px solid #D6E3F5', color: '#1D4E89', borderRadius: 999, padding: '5px 12px', fontSize: 13 }}>{f}</span>)}
            </div>
            <div style={{ fontSize: 13, color: '#667085', marginTop: 16 }}>Tell Claude to build this section and it becomes a working tab here.</div>
          </div>
        </div>
      )}
    </div>
  )
}
