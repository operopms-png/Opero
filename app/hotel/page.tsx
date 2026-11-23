'use client'
// Hotels: NOVOURQ's own hotel management area, opened from Real Estate Intelligence next to Vacation Rentals and Developments.
// For now it is an empty shell: tabs are added here as each part of hotel management is built. Only the owner company and its
// staff can open it (the same database check as Fleet and Rides); client companies do not see it.
import { useState } from 'react'
import ModuleTabStrip from '@/components/ModuleTabStrip'
import { useFleetAccess } from '@/lib/fleet-access'

const GROUPS = [{ label: 'OVERVIEW', items: ['Dashboard'] }]
const TEXT: Record<string, string> = {
  Dashboard: 'Your hotel management area. It is being set up: each part (rooms, reservations, housekeeping, rates and more) will appear here as a tab once it is built.',
}

export default function HotelPage() {
  const access = useFleetAccess()
  const [tab, setTab] = useState('Dashboard')
  if (access === null) return <div style={{ padding: 24, color: '#667085' }}>Loading…</div>
  if (access === 'none') return <div style={{ padding: 32, color: '#475467' }}>You do not have access to this page. Ask an admin.</div>
  return (
    <div>
      <ModuleTabStrip module="hotel" current={tab} groups={GROUPS} onSelect={setTab} />
      <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid #C9DEF3' }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: '#1D4E89', margin: '0 0 2px' }}>{tab}</h1>
        <div style={{ fontSize: 13, color: '#4A6F98', maxWidth: 760, lineHeight: 1.5 }}>{TEXT[tab]}</div>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '28px 24px', maxWidth: 640 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1D4E89', marginBottom: 6 }}>Hotels is ready to build</div>
          <div style={{ fontSize: 14, color: '#475467', lineHeight: 1.6 }}>Nothing is here yet. Tell Claude which part of hotel management to build first and it will appear as a tab on this page.</div>
        </div>
      </div>
    </div>
  )
}
