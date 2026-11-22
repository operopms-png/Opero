import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Fleet and Rides list tabs (NOVOURQ own company only). They reuse RecordTab; the parent is the vehicle.
const money = (sym: string, n: any) => (n == null || n === '' ? '—' : `${sym}${Number(n).toLocaleString()}`)
const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
const due = (d: string | null, today: string, done = false) => {
  if (!d) return <span style={{ color: '#98A2B3' }}>—</span>
  const n = days(d, today)
  const late = !done && n < 0
  const soon = !done && n >= 0 && n <= 30
  return <span style={{ color: late ? '#B42318' : soon ? '#B54708' : '#344054', fontWeight: late || soon ? 600 : 400 }}>{d}{late ? ` (${-n}d late)` : soon ? ` (in ${n}d)` : ''}</span>
}
const PARENT = { table: 'fleet_vehicles', cols: 'name', label: 'vehicle', all: 'No vehicle' }
const NOPARENT = { table: '', cols: '', label: 'vehicle' }
const veh = (r: any) => <span style={{ fontWeight: 500, color: '#323338' }}>{r.fleet_vehicles?.name ?? '—'}</span>
const vehField = { key: 'vehicle_id', label: 'Vehicle', type: 'property' as const, required: true }
const vehOptional = { key: 'vehicle_id', label: 'Vehicle', type: 'property' as const }
const sum = (rows: any[], k: string) => rows.reduce((a, r) => a + Number(r[k] || 0), 0)

export const FLEET_VEHICLES: RecordTabConfig = {
  table: 'fleet_vehicles', noun: 'vehicle', empty: 'No vehicles yet', orderBy: 'created_at', ascending: false, parent: NOPARENT,
  defaults: { status: 'Available' },
  fields: [
    { key: 'make', label: 'Make', required: true, half: true },
    { key: 'model', label: 'Model', required: true, half: true },
    { key: 'registration', label: 'Registration plate', required: true, half: true },
    { key: 'year', label: 'Year', type: 'number', half: true },
    { key: 'colour', label: 'Colour', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Available', 'On the road', 'In garage', 'Parked', 'Sold'], required: true, half: true },
    { key: 'driver_name', label: 'Current driver', half: true },
    { key: 'odometer_km', label: 'Odometer (km)', type: 'number', half: true },
    { key: 'next_service_km', label: 'Next service at (km)', type: 'number', half: true },
    { key: 'vin', label: 'Chassis / VIN', half: true },
    { key: 'purchase_date', label: 'Bought on', type: 'date', half: true },
    { key: 'purchase_price', label: 'Purchase price', type: 'number', half: true },
    { key: 'import_duty', label: 'Import duty and fees', type: 'number', half: true },
    { key: 'other_costs', label: 'Other set-up costs', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Vehicle', width: '1.4fr', render: r => <b>{r.name}</b> },
    { label: 'Driver', width: '1fr', render: r => r.driver_name ?? '—' },
    { label: 'Status', width: '110px', render: r => r.status },
    { label: 'Odometer', width: '110px', render: r => r.odometer_km != null ? `${Number(r.odometer_km).toLocaleString()} km` : '—' },
    { label: 'Total cost in', width: '120px', render: (r, c) => money(c.sym(r), Number(r.purchase_price || 0) + Number(r.import_duty || 0) + Number(r.other_costs || 0)) },
  ],
  summary: rows => [
    { label: 'Vehicles', value: String(rows.filter(r => r.status !== 'Sold').length) },
    { label: 'On the road', value: String(rows.filter(r => r.status === 'On the road').length), tone: 'ok' },
    { label: 'In garage', value: String(rows.filter(r => r.status === 'In garage').length), tone: rows.some(r => r.status === 'In garage') ? 'warn' : undefined },
  ],
}

export const FLEET_DRIVERS: RecordTabConfig = {
  table: 'fleet_drivers', noun: 'driver', empty: 'No drivers yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { status: 'Active', pay_model: 'Weekly rent' },
  fields: [
    { key: 'driver_name', label: 'Name', required: true },
    { key: 'vehicle_id', label: 'Assigned vehicle', type: 'property' },
    { key: 'phone', label: 'Phone', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'licence_no', label: 'Licence number', half: true },
    { key: 'licence_expiry', label: 'Licence expires', type: 'date', half: true },
    { key: 'badge_expiry', label: 'Taxi badge expires', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On leave', 'Left'], required: true, half: true },
    { key: 'pay_model', label: 'How the driver pays', type: 'select', options: ['Weekly rent', 'Percentage of earnings', 'Salary'], half: true },
    { key: 'pay_amount', label: 'Amount or %', type: 'number', half: true },
    { key: 'start_date', label: 'Started', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Driver', width: '1.2fr', render: r => <b>{r.driver_name}</b> },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Phone', width: '120px', render: r => r.phone ?? '—' },
    { label: 'Licence', width: '150px', render: (r, c) => due(r.licence_expiry ?? null, c.today, r.status === 'Left') },
    { label: 'Badge', width: '150px', render: (r, c) => due(r.badge_expiry ?? null, c.today, r.status === 'Left') },
    { label: 'Status', width: '90px', render: r => r.status },
  ],
}

export const FLEET_TRIPS: RecordTabConfig = {
  table: 'fleet_trips', noun: 'trip', empty: 'No trips yet', orderBy: 'trip_date', ascending: false, parent: PARENT,
  defaults: { platform: 'Uber' },
  fields: [
    vehOptional,
    { key: 'trip_date', label: 'Date', type: 'date', required: true, half: true },
    { key: 'driver_name', label: 'Driver', half: true },
    { key: 'platform', label: 'Platform', type: 'select', options: ['Uber', 'inDrive', 'Direct booking', 'Airport transfer', 'Other'], half: true },
    { key: 'fare', label: 'Fare', type: 'number', half: true },
    { key: 'pickup', label: 'Pickup', half: true },
    { key: 'dropoff', label: 'Drop-off', half: true },
    { key: 'distance_km', label: 'Distance (km)', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Date', width: '110px', render: r => r.trip_date ?? '—' },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Driver', width: '1fr', render: r => r.driver_name ?? '—' },
    { label: 'Route', width: '1.4fr', render: r => [r.pickup, r.dropoff].filter(Boolean).join(' to ') || '—' },
    { label: 'Platform', width: '120px', render: r => r.platform ?? '—' },
    { label: 'Fare', width: '100px', render: (r, c) => money(c.sym(r), r.fare) },
  ],
  summary: rows => [{ label: 'Trips', value: String(rows.length) }, { label: 'Fares', value: sum(rows, 'fare').toLocaleString() }],
}

export const FLEET_EARNINGS: RecordTabConfig = {
  table: 'fleet_earnings', noun: 'earnings line', empty: 'No earnings yet. Add a line or import a statement.', orderBy: 'period_end', ascending: false, parent: PARENT,
  defaults: { platform: 'Uber', source: 'Manual' },
  fields: [
    vehOptional,
    { key: 'driver_name', label: 'Driver', half: true },
    { key: 'platform', label: 'Platform', type: 'select', options: ['Uber', 'inDrive', 'Direct booking', 'Other'], half: true },
    { key: 'period_start', label: 'From', type: 'date', required: true, half: true },
    { key: 'period_end', label: 'To', type: 'date', required: true, half: true },
    { key: 'gross', label: 'Gross', type: 'number', half: true },
    { key: 'platform_fee', label: 'Platform fees', type: 'number', half: true },
    { key: 'tips', label: 'Tips', type: 'number', half: true },
    { key: 'net', label: 'Net paid out', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Period', width: '190px', render: r => `${r.period_start ?? ''} to ${r.period_end ?? ''}` },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Driver', width: '1fr', render: r => r.driver_name ?? '—' },
    { label: 'Platform', width: '100px', render: r => r.platform ?? '—' },
    { label: 'Gross', width: '100px', render: (r, c) => money(c.sym(r), r.gross) },
    { label: 'Net', width: '100px', render: (r, c) => money(c.sym(r), r.net) },
  ],
  summary: rows => [{ label: 'Gross', value: sum(rows, 'gross').toLocaleString() }, { label: 'Net', value: sum(rows, 'net').toLocaleString(), tone: 'ok' }],
}

export const FLEET_EXPENSES: RecordTabConfig = {
  table: 'fleet_expenses', noun: 'expense', empty: 'No expenses yet', orderBy: 'expense_date', ascending: false, parent: PARENT,
  defaults: { category: 'Fuel' },
  fields: [
    vehOptional,
    { key: 'expense_date', label: 'Date', type: 'date', required: true, half: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Fuel', 'Repairs', 'Tyres', 'Insurance', 'Licence and fitness', 'Cleaning', 'Fines', 'Parking and tolls', 'Other'], required: true, half: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true, half: true },
    { key: 'vendor', label: 'Paid to', half: true },
    { key: 'driver_name', label: 'Driver', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Date', width: '110px', render: r => r.expense_date ?? '—' },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Category', width: '150px', render: r => r.category },
    { label: 'Paid to', width: '1fr', render: r => r.vendor ?? '—' },
    { label: 'Amount', width: '110px', render: (r, c) => money(c.sym(r), r.amount) },
  ],
  summary: rows => [{ label: 'Total', value: sum(rows, 'amount').toLocaleString() }, { label: 'Fuel', value: sum(rows.filter(r => r.category === 'Fuel'), 'amount').toLocaleString() }],
}

export const FLEET_SERVICE: RecordTabConfig = {
  table: 'fleet_service', noun: 'service job', empty: 'No service or repair jobs yet', orderBy: 'service_date', ascending: false, parent: PARENT,
  defaults: { kind: 'Service', status: 'Planned' },
  fields: [
    vehField,
    { key: 'kind', label: 'Type', type: 'select', options: ['Service', 'Oil change', 'Repair', 'Tyres', 'Brakes', 'Inspection', 'Accident repair'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'In garage', 'Done'], required: true, half: true },
    { key: 'service_date', label: 'Date', type: 'date', half: true },
    { key: 'odometer_km', label: 'Odometer (km)', type: 'number', half: true },
    { key: 'garage', label: 'Garage', half: true },
    { key: 'cost', label: 'Cost', type: 'number', half: true },
    { key: 'next_due_date', label: 'Next due date', type: 'date', half: true },
    { key: 'next_due_km', label: 'Next due at (km)', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Job', width: '130px', render: r => r.kind },
    { label: 'Date', width: '110px', render: r => r.service_date ?? '—' },
    { label: 'Garage', width: '1fr', render: r => r.garage ?? '—' },
    { label: 'Cost', width: '100px', render: (r, c) => money(c.sym(r), r.cost) },
    { label: 'Next due', width: '150px', render: (r, c) => due(r.next_due_date ?? null, c.today, r.status !== 'Done') },
    { label: 'Status', width: '90px', render: r => r.status },
  ],
  actions: [{ label: 'Done', show: r => r.status !== 'Done', patch: () => ({ status: 'Done' }) }],
  summary: rows => [{ label: 'In garage', value: String(rows.filter(r => r.status === 'In garage').length), tone: rows.some(r => r.status === 'In garage') ? 'warn' : undefined }, { label: 'Spent', value: sum(rows, 'cost').toLocaleString() }],
}

export const FLEET_PAYMENTS: RecordTabConfig = {
  table: 'fleet_payments', noun: 'driver payment', empty: 'No driver payments yet', orderBy: 'week_start', ascending: false, parent: PARENT,
  defaults: { status: 'Due', amount_paid: 0 },
  fields: [
    vehOptional,
    { key: 'driver_name', label: 'Driver', required: true, half: true },
    { key: 'week_start', label: 'Week starting', type: 'date', required: true, half: true },
    { key: 'amount_due', label: 'Amount due', type: 'number', half: true },
    { key: 'amount_paid', label: 'Amount paid', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Due', 'Part paid', 'Paid'], required: true, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Week', width: '120px', render: r => r.week_start ?? '—' },
    { label: 'Driver', width: '1fr', render: r => <b>{r.driver_name}</b> },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Due', width: '100px', render: (r, c) => money(c.sym(r), r.amount_due) },
    { label: 'Paid', width: '100px', render: (r, c) => money(c.sym(r), r.amount_paid) },
    { label: 'Status', width: '90px', render: r => r.status },
  ],
  actions: [{ label: 'Paid in full', show: r => r.status !== 'Paid', patch: r => ({ status: 'Paid', amount_paid: r.amount_due }) }],
  summary: rows => {
    const owed = rows.reduce((a, r) => a + Math.max(0, Number(r.amount_due || 0) - Number(r.amount_paid || 0)), 0)
    return [{ label: 'Still owed by drivers', value: owed.toLocaleString(), tone: owed ? 'warn' : undefined }]
  },
}

export const FLEET_DOCUMENTS: RecordTabConfig = {
  table: 'fleet_documents', noun: 'document', empty: 'No insurance, fitness or licence records yet', orderBy: 'expiry_date', ascending: true, parent: PARENT,
  defaults: { kind: 'Insurance' },
  fields: [
    vehOptional,
    { key: 'kind', label: 'Type', type: 'select', options: ['Insurance', 'Fitness certificate', 'Road licence', 'Registration', 'Driver licence', 'Taxi badge', 'Operator permit', 'Other'], required: true, half: true },
    { key: 'title', label: 'Title', required: true, half: true },
    { key: 'driver_name', label: 'Driver (if personal)', half: true },
    { key: 'reference', label: 'Policy / reference', half: true },
    { key: 'provider', label: 'Provider', half: true },
    { key: 'issue_date', label: 'Issued', type: 'date', half: true },
    { key: 'expiry_date', label: 'Expires', type: 'date', required: true, half: true },
    { key: 'document_url', label: 'Document link' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Title', width: '1.2fr', render: r => <b>{r.title}</b> },
    { label: 'Type', width: '140px', render: r => r.kind },
    { label: 'Vehicle', width: '1.2fr', render: r => veh(r) },
    { label: 'Provider', width: '1fr', render: r => r.provider ?? '—' },
    { label: 'Expires', width: '170px', render: (r, c) => due(r.expiry_date ?? null, c.today) },
  ],
  summary: (rows, today) => {
    const soon = rows.filter(r => r.expiry_date && days(r.expiry_date, today) <= 30).length
    return [{ label: 'Expired or due in 30 days', value: String(soon), tone: soon ? 'warn' : 'ok' }]
  },
}
