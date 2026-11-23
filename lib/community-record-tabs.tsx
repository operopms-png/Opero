import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Gated Communities list tabs (NOVOURQ own company only). They reuse RecordTab; the parent is the unit.
const PARENT = { table: 'community_units', cols: 'name', label: 'unit', all: 'No unit' }
const NOPARENT = { table: '', cols: '', label: 'unit' }
const unitName = (r: any) => r.community_units?.name ?? '—'
const unitField = { key: 'unit_id', label: 'Unit', type: 'property' as const, half: true }
const hm = (t: string | null) => (t ? new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—')
const overdue = (d: string | null, today: string, done: boolean) => !!d && !done && d < today

export const COMMUNITY_UNITS: RecordTabConfig = {
  table: 'community_units', noun: 'unit', empty: 'No units yet', orderBy: 'unit_number', ascending: true, parent: NOPARENT,
  defaults: { status: 'Owner occupied' },
  fields: [
    { key: 'unit_number', label: 'Unit or house number', required: true, half: true },
    { key: 'block', label: 'Block or zone', half: true },
    { key: 'street', label: 'Street', half: true },
    { key: 'unit_type', label: 'Type', type: 'select', options: ['House', 'Townhouse', 'Apartment', 'Villa', 'Plot', 'Other'], half: true },
    { key: 'bedrooms', label: 'Bedrooms', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Owner occupied', 'Rented', 'Vacant', 'Under construction'], required: true, half: true },
    { key: 'owner_name', label: 'Owner' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Unit', width: '110px', render: r => <b>{r.name}</b> },
    { label: 'Street', width: '1fr', render: r => r.street ?? '—' },
    { label: 'Type', width: '110px', render: r => r.unit_type ?? '—' },
    { label: 'Beds', width: '60px', render: r => r.bedrooms ?? '—' },
    { label: 'Status', width: '140px', render: r => r.status },
    { label: 'Owner', width: '1fr', render: r => r.owner_name ?? '—' },
  ],
  summary: rows => [
    { label: 'Units', value: String(rows.length) },
    { label: 'Owner occupied', value: String(rows.filter(r => r.status === 'Owner occupied').length) },
    { label: 'Rented', value: String(rows.filter(r => r.status === 'Rented').length) },
    { label: 'Vacant', value: String(rows.filter(r => r.status === 'Vacant').length), tone: rows.some(r => r.status === 'Vacant') ? 'warn' : undefined },
  ],
}

export const COMMUNITY_RESIDENTS: RecordTabConfig = {
  table: 'community_residents', noun: 'resident', empty: 'No residents yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { resident_type: 'Homeowner', status: 'Active' },
  fields: [
    { key: 'name', label: 'Name', required: true, half: true },
    { key: 'resident_type', label: 'Type', type: 'select', options: ['Homeowner', 'Tenant', 'Family member', 'Domestic staff', 'Other'], required: true, half: true },
    unitField,
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Moved out'], required: true, half: true },
    { key: 'phone', label: 'Phone', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'move_in', label: 'Moved in', type: 'date', half: true },
    { key: 'move_out', label: 'Moved out', type: 'date', half: true },
    { key: 'vehicle_plate', label: 'Vehicle plate(s)' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Name', width: '1.2fr', render: r => <b>{r.name}</b> },
    { label: 'Type', width: '120px', render: r => r.resident_type },
    { label: 'Unit', width: '110px', render: r => unitName(r) },
    { label: 'Phone', width: '140px', render: r => r.phone ?? '—' },
    { label: 'Status', width: '100px', render: r => r.status },
  ],
  summary: rows => [
    { label: 'Registered residents', value: String(rows.filter(r => r.status === 'Active').length) },
    { label: 'Homeowners', value: String(rows.filter(r => r.status === 'Active' && r.resident_type === 'Homeowner').length) },
    { label: 'Tenants', value: String(rows.filter(r => r.status === 'Active' && r.resident_type === 'Tenant').length) },
  ],
}

export const COMMUNITY_VISITORS: RecordTabConfig = {
  table: 'community_visitors', noun: 'visitor', empty: 'No visitors yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { visitor_type: 'Guest', status: 'Expected' },
  fields: [
    { key: 'visitor_name', label: 'Visitor name', required: true, half: true },
    { key: 'visitor_type', label: 'Type', type: 'select', options: ['Guest', 'Delivery', 'Contractor', 'Service provider', 'Other'], required: true, half: true },
    unitField,
    { key: 'host_name', label: 'Visiting (resident)', half: true },
    { key: 'expected_date', label: 'Expected on', type: 'date', half: true },
    { key: 'vehicle_plate', label: 'Vehicle plate', half: true },
    { key: 'pass_code', label: 'Access code or pass number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Expected', 'On site', 'Left', 'Denied'], required: true, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Visitor', width: '1.2fr', render: r => <b>{r.visitor_name}</b> },
    { label: 'Type', width: '110px', render: r => r.visitor_type },
    { label: 'Unit', width: '100px', render: r => unitName(r) },
    { label: 'Expected', width: '110px', render: r => r.expected_date ?? '—' },
    { label: 'In / out', width: '110px', render: r => `${hm(r.time_in)} / ${hm(r.time_out)}` },
    { label: 'Status', width: '100px', render: r => <span style={{ fontWeight: 600, color: r.status === 'Denied' ? '#B42318' : r.status === 'On site' ? '#027A48' : '#344054' }}>{r.status}</span> },
  ],
  actions: [
    { label: 'Check in', show: r => r.status === 'Expected', patch: () => ({ status: 'On site', time_in: new Date().toISOString() }) },
    { label: 'Check out', show: r => r.status === 'On site', patch: () => ({ status: 'Left', time_out: new Date().toISOString() }) },
    { label: 'Deny entry', show: r => r.status === 'Expected', patch: () => ({ status: 'Denied' }) },
  ],
  summary: (rows, today) => [
    { label: 'Expected today', value: String(rows.filter(r => r.expected_date === today && r.status === 'Expected').length) },
    { label: 'On site now', value: String(rows.filter(r => r.status === 'On site').length), tone: 'ok' },
    { label: 'Denied', value: String(rows.filter(r => r.status === 'Denied').length) },
  ],
}

export const COMMUNITY_MAINTENANCE: RecordTabConfig = {
  table: 'community_maintenance', noun: 'request', empty: 'No maintenance requests yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { priority: 'Normal', status: 'Open' },
  fields: [
    { key: 'title', label: 'What needs fixing', required: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Plumbing', 'Electrical', 'Roads and drainage', 'Streetlights', 'Gate and fencing', 'Pool', 'Gym', 'Playground', 'Roof', 'Landscaping', 'Cleaning', 'Other'], half: true },
    { key: 'area', label: 'Where (common area, road, clubhouse…)', half: true },
    unitField,
    { key: 'reported_by', label: 'Reported by', half: true },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Emergency'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Waiting approval', 'Done'], required: true, half: true },
    { key: 'assigned_to', label: 'Assigned to', half: true },
    { key: 'due_date', label: 'Due', type: 'date', half: true },
    { key: 'cost', label: 'Cost', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Request', width: '1.5fr', render: r => <b>{r.title}</b> },
    { label: 'Where', width: '1fr', render: r => (r.community_units?.name ?? r.area) || '—' },
    { label: 'Priority', width: '100px', render: r => <span style={{ fontWeight: 600, color: r.priority === 'Emergency' ? '#B42318' : r.priority === 'High' ? '#B54708' : '#344054' }}>{r.priority}</span> },
    { label: 'Status', width: '130px', render: r => r.status },
    { label: 'Due', width: '110px', render: (r, c) => <span style={{ color: overdue(r.due_date, c.today, r.status === 'Done') ? '#B42318' : '#344054' }}>{r.due_date ?? '—'}</span> },
  ],
  actions: [
    { label: 'Start', show: r => r.status === 'Open', patch: () => ({ status: 'In progress' }) },
    { label: 'Mark done', show: r => r.status !== 'Done', patch: () => ({ status: 'Done' }) },
  ],
  summary: (rows, today) => [
    { label: 'Open', value: String(rows.filter(r => r.status !== 'Done').length) },
    { label: 'Emergency or high', value: String(rows.filter(r => r.status !== 'Done' && ['Emergency', 'High'].includes(r.priority)).length), tone: rows.some(r => r.status !== 'Done' && ['Emergency', 'High'].includes(r.priority)) ? 'warn' : 'ok' },
    { label: 'Overdue', value: String(rows.filter(r => overdue(r.due_date, today, r.status === 'Done')).length), tone: rows.some(r => overdue(r.due_date, today, r.status === 'Done')) ? 'warn' : undefined },
  ],
}

export const COMMUNITY_COMPLAINTS: RecordTabConfig = {
  table: 'community_complaints', noun: 'complaint', empty: 'No complaints yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { status: 'Open' },
  fields: [
    { key: 'title', label: 'What is the complaint', required: true },
    { key: 'category', label: 'Type', type: 'select', options: ['Noise', 'Parking', 'Security', 'Maintenance', 'Neighbour dispute', 'Rule violation', 'Staff or service', 'Other'], half: true },
    unitField,
    { key: 'raised_by', label: 'Raised by', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Investigating', 'Resolved', 'Closed'], required: true, half: true },
    { key: 'assigned_to', label: 'Handled by', half: true },
    { key: 'due_date', label: 'Reply by', type: 'date', half: true },
    { key: 'outcome', label: 'Outcome', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Complaint', width: '1.5fr', render: r => <b>{r.title}</b> },
    { label: 'Type', width: '140px', render: r => r.category ?? '—' },
    { label: 'Unit', width: '100px', render: r => unitName(r) },
    { label: 'Status', width: '120px', render: r => r.status },
    { label: 'Reply by', width: '110px', render: (r, c) => <span style={{ color: overdue(r.due_date, c.today, ['Resolved', 'Closed'].includes(r.status)) ? '#B42318' : '#344054' }}>{r.due_date ?? '—'}</span> },
  ],
  actions: [
    { label: 'Investigate', show: r => r.status === 'Open', patch: () => ({ status: 'Investigating' }) },
    { label: 'Resolve', show: r => ['Open', 'Investigating'].includes(r.status), patch: () => ({ status: 'Resolved' }) },
  ],
  summary: rows => [
    { label: 'Open', value: String(rows.filter(r => ['Open', 'Investigating'].includes(r.status)).length), tone: rows.some(r => r.status === 'Open') ? 'warn' : 'ok' },
    { label: 'Resolved', value: String(rows.filter(r => ['Resolved', 'Closed'].includes(r.status)).length) },
  ],
}
