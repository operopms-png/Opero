'use client'
// Fleet and Rides: NOVOURQ's own taxi and ride-hailing business. Only the owner company and its staff can open it;
// per-staff access (view only, full, none) is set in Settings → Team Management. The database enforces it too.
import { useEffect, useState } from 'react'
import ModuleTabStrip from '@/components/ModuleTabStrip'
import RecordTab from '@/components/pm/RecordTab'
import { supabase, getAccountId } from '@/lib/supabase'
import { useFleetAccess } from '@/lib/fleet-access'
import { FleetDashboard, EarningsImport } from '@/components/fleet/FleetTools'
import { FLEET_VEHICLES, FLEET_DRIVERS, FLEET_TRIPS, FLEET_EARNINGS, FLEET_EXPENSES, FLEET_SERVICE, FLEET_PAYMENTS, FLEET_DOCUMENTS } from '@/lib/fleet-record-tabs'

const GROUPS = [
  { label: 'OVERVIEW', items: ['Dashboard'] },
  { label: 'VEHICLES', items: ['Vehicles', 'Service', 'Documents'] },
  { label: 'DRIVERS', items: ['Drivers', 'Driver Payments'] },
  { label: 'TRIPS AND EARNINGS', items: ['Trips', 'Earnings', 'Expenses'] },
]
const TEXT: Record<string, string> = {
  Dashboard: 'Your cars, today and this week: cars on the road, earnings, costs, what drivers owe you, expiring papers and how far each car has paid itself back.',
  Vehicles: 'Every car you own with its plate, driver, status and what it cost you in (price, import duty and set-up).',
  Service: 'Services, repairs and tyres per car, what they cost and when the next one is due.',
  Documents: 'Insurance, fitness, road licence, registration and taxi badges with expiry dates, so nothing lapses.',
  Drivers: 'Your drivers, their phone, licence and badge expiry, the car they have and how they pay you.',
  'Driver Payments': 'The weekly rent or share each driver owes you and what they have paid.',
  Trips: 'Individual trips, including direct bookings and airport transfers, with fare and route.',
  Earnings: 'What each car earned per period, from Uber and other platforms. Add lines by hand or import a CSV statement.',
  Expenses: 'Fuel, repairs, insurance, fines and every other cost per car.',
}

export default function FleetPage() {
  const access = useFleetAccess()
  const [tab, setTab] = useState('Dashboard')
  const [acct, setAcct] = useState('')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (!access || access === 'none') return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const id = await getAccountId(user)
      setAcct(id)
      const { data } = await supabase.from('fleet_vehicles').select('id,name').eq('user_id', id)
      setVehicles(data ?? [])
    })()
  }, [access, tab])
  if (access === null) return <div style={{ padding: 24, color: '#667085' }}>Loading…</div>
  if (access === 'none') return <div style={{ padding: 32, color: '#475467' }}>You do not have access to this page. Ask an admin.</div>
  const ro = access === 'view'
  const rt = (cfg: any) => <RecordTab key={tab + bump} cfg={cfg} userId={acct} properties={vehicles} readOnly={ro} />
  return (
    <div>
      <ModuleTabStrip module="fleet" current={tab} groups={GROUPS} onSelect={setTab} />
      <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid #C9DEF3' }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: '#1D4E89', margin: '0 0 2px' }}>{tab}</h1>
        <div style={{ fontSize: 13, color: '#4A6F98', maxWidth: 760, lineHeight: 1.5 }}>{TEXT[tab]}{ro ? ' You have view only access.' : ''}</div>
      </div>
      {tab === 'Dashboard' && <FleetDashboard userId={acct} go={setTab} />}
      {tab === 'Vehicles' && rt(FLEET_VEHICLES)}
      {tab === 'Service' && rt(FLEET_SERVICE)}
      {tab === 'Documents' && rt(FLEET_DOCUMENTS)}
      {tab === 'Drivers' && rt(FLEET_DRIVERS)}
      {tab === 'Driver Payments' && rt(FLEET_PAYMENTS)}
      {tab === 'Trips' && rt(FLEET_TRIPS)}
      {tab === 'Earnings' && <>{!ro && acct && <EarningsImport userId={acct} onDone={() => setBump(b => b + 1)} />}{rt(FLEET_EARNINGS)}</>}
      {tab === 'Expenses' && rt(FLEET_EXPENSES)}
    </div>
  )
}
