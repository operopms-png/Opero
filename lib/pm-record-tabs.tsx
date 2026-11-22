import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Configuration for the four list tabs in Property Management that share the RecordTab component.
const money = (sym: string, n: any) => (n == null || n === '' ? '—' : `${sym}${Number(n).toLocaleString()}`)
const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
const due = (d: string | null, today: string, done = false) => {
  if (!d) return <span style={{ color: '#98A2B3' }}>—</span>
  const n = days(d, today)
  const late = !done && n < 0
  const soon = !done && n >= 0 && n <= 30
  return <span style={{ color: late ? '#B42318' : soon ? '#B54708' : '#344054', fontWeight: late || soon ? 600 : 400 }}>{d}{late ? ` (${-n}d late)` : soon ? ` (in ${n}d)` : ''}</span>
}
const prop = (r: any) => <span style={{ fontWeight: 500, color: '#323338' }}>{r.pm_properties?.name ?? 'All properties'}</span>

function addMonths(date: string, m: number) { const d = new Date(date); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10) }
const FREQ_MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3, 'Every 6 months': 6, Yearly: 12, 'Every 2 years': 24, 'Every 5 years': 60 }

export const RENT_REVIEWS: RecordTabConfig = {
  table: 'pm_rent_reviews', noun: 'rent review', empty: 'No rent reviews yet', orderBy: 'review_date', ascending: true,
  defaults: { status: 'Upcoming' },
  fields: [
    { key: 'property_id', label: 'Property', type: 'property', required: true },
    { key: 'tenant_name', label: 'Tenant', half: true },
    { key: 'review_date', label: 'Review date', type: 'date', required: true, half: true },
    { key: 'current_rent', label: 'Current rent', type: 'number', half: true },
    { key: 'proposed_rent', label: 'Proposed rent', type: 'number', half: true },
    { key: 'notice_sent_date', label: 'Notice sent on', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Upcoming', 'Notice sent', 'Agreed', 'Declined', 'Done'], required: true, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.3fr', render: r => prop(r) },
    { label: 'Tenant', width: '1fr', render: r => r.tenant_name ?? '—' },
    { label: 'Review date', width: '150px', render: (r, c) => due(r.review_date, c.today, ['Agreed', 'Declined', 'Done'].includes(r.status)) },
    { label: 'Rent now', width: '100px', render: (r, c) => money(c.sym(r), r.current_rent) },
    { label: 'Proposed', width: '110px', render: (r, c) => money(c.sym(r), r.proposed_rent) },
    { label: 'Status', width: '110px', render: r => r.status },
  ],
  actions: [
    { label: 'Notice sent', show: r => r.status === 'Upcoming', patch: () => ({ status: 'Notice sent', notice_sent_date: new Date().toISOString().slice(0, 10) }) },
    { label: 'Agreed', show: r => r.status === 'Notice sent', patch: () => ({ status: 'Agreed' }) },
  ],
  summary: (rows, today) => {
    const open = rows.filter(r => ['Upcoming', 'Notice sent'].includes(r.status))
    return [
      { label: 'Open reviews', value: String(open.length) },
      { label: 'Due in 60 days', value: String(open.filter(r => days(r.review_date, today) <= 60).length), tone: open.some(r => days(r.review_date, today) <= 60) ? 'warn' : 'ok' },
    ]
  },
}

export const SERVICE_CHARGES: RecordTabConfig = {
  table: 'pm_service_charges', noun: 'charge', empty: 'No service charges or ground rent recorded yet', orderBy: 'due_date', ascending: true,
  defaults: { kind: 'Service charge', frequency: 'Yearly', status: 'Due' },
  fields: [
    { key: 'property_id', label: 'Property', type: 'property', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Service charge', 'Ground rent', 'Sinking fund'], required: true, half: true },
    { key: 'unit_label', label: 'Unit or flat', half: true },
    { key: 'payable_to', label: 'Payable to (freeholder or managing agent)' },
    { key: 'amount', label: 'Amount', type: 'number', required: true, half: true },
    { key: 'frequency', label: 'How often', type: 'select', options: ['Monthly', 'Quarterly', 'Every 6 months', 'Yearly'], required: true, half: true },
    { key: 'due_date', label: 'Next due', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Due', 'Paid', 'Disputed'], required: true, half: true },
    { key: 'paid_date', label: 'Paid on', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.2fr', render: r => <span>{prop(r)}{r.unit_label ? <span style={{ color: '#98A2B3' }}> · {r.unit_label}</span> : null}</span> },
    { label: 'Type', width: '120px', render: r => r.kind },
    { label: 'Payable to', width: '1fr', render: r => r.payable_to ?? '—' },
    { label: 'Amount', width: '130px', render: (r, c) => <span style={{ fontWeight: 600 }}>{money(c.sym(r), r.amount)}<span style={{ color: '#98A2B3', fontWeight: 400 }}> {String(r.frequency).toLowerCase()}</span></span> },
    { label: 'Next due', width: '150px', render: (r, c) => due(r.due_date, c.today, r.status === 'Paid') },
    { label: 'Status', width: '90px', render: r => r.status },
  ],
  actions: [
    {
      label: 'Mark paid', show: r => r.status !== 'Paid',
      patch: r => ({ status: 'Paid', paid_date: new Date().toISOString().slice(0, 10) }),
    },
    {
      label: 'Next period', show: r => r.status === 'Paid' && !!r.due_date,
      patch: r => ({ status: 'Due', paid_date: null, due_date: addMonths(r.due_date, FREQ_MONTHS[r.frequency] ?? 12) }),
    },
  ],
  summary: (rows, today) => {
    const open = rows.filter(r => r.status !== 'Paid')
    const late = open.filter(r => r.due_date && r.due_date < today)
    return [
      { label: 'Unpaid', value: String(open.length) },
      { label: 'Overdue', value: String(late.length), tone: late.length ? 'warn' : 'ok' },
    ]
  },
}

export const PLANNED_MAINTENANCE: RecordTabConfig = {
  table: 'pm_planned_maintenance', noun: 'planned job', empty: 'No planned maintenance yet', orderBy: 'next_due', ascending: true,
  defaults: { frequency: 'Yearly', status: 'Active' },
  fields: [
    { key: 'property_id', label: 'Property', type: 'property', required: true },
    { key: 'task', label: 'Job (for example boiler service, gutters, legionella flush)', required: true },
    { key: 'frequency', label: 'How often', type: 'select', options: Object.keys(FREQ_MONTHS), required: true, half: true },
    { key: 'next_due', label: 'Next due', type: 'date', required: true, half: true },
    { key: 'last_done', label: 'Last done', type: 'date', half: true },
    { key: 'assigned_to', label: 'Who does it', half: true },
    { key: 'cost_estimate', label: 'Estimated cost', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused'], required: true, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.2fr', render: r => prop(r) },
    { label: 'Job', width: '1.3fr', render: r => r.task },
    { label: 'Every', width: '120px', render: r => r.frequency },
    { label: 'Next due', width: '150px', render: (r, c) => due(r.next_due, c.today, r.status === 'Paused') },
    { label: 'Last done', width: '110px', render: r => r.last_done ?? '—' },
    { label: 'Who', width: '110px', render: r => r.assigned_to ?? '—' },
  ],
  actions: [
    {
      label: 'Done', show: r => r.status === 'Active',
      patch: r => {
        const t = new Date().toISOString().slice(0, 10)
        return { last_done: t, next_due: addMonths(t, FREQ_MONTHS[r.frequency] ?? 12) }
      },
    },
  ],
  summary: (rows, today) => {
    const act = rows.filter(r => r.status === 'Active')
    const late = act.filter(r => r.next_due && r.next_due < today)
    return [
      { label: 'Active jobs', value: String(act.length) },
      { label: 'Overdue', value: String(late.length), tone: late.length ? 'warn' : 'ok' },
    ]
  },
}

export const EMERGENCY_CONTACTS: RecordTabConfig = {
  table: 'pm_emergency_contacts', noun: 'contact', empty: 'No emergency contacts yet', orderBy: 'role', ascending: true,
  fields: [
    { key: 'property_id', label: 'Property (leave on All properties for every property)', type: 'property' },
    { key: 'role', label: 'Role', type: 'select', options: ['Plumber', 'Electrician', 'Gas engineer', 'Locksmith', 'Roofer', 'Drainage', 'Key holder', 'Out-of-hours number', 'Building manager', 'Insurer', 'Other'], required: true, half: true },
    { key: 'name', label: 'Name or company', required: true, half: true },
    { key: 'phone', label: 'Phone', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'availability', label: 'When available (for example 24 hours, weekdays 8 to 6)' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Role', width: '140px', render: r => <span style={{ fontWeight: 600, color: '#1D4E89' }}>{r.role}</span> },
    { label: 'Name', width: '1.1fr', render: r => r.name },
    { label: 'Phone', width: '140px', render: r => r.phone ? <a href={`tel:${r.phone}`} style={{ color: '#2F6DB5' }}>{r.phone}</a> : '—' },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Available', width: '1fr', render: r => r.availability ?? '—' },
  ],
}

const REF = ['Not started', 'Requested', 'Passed', 'Failed']

export const APPLICATIONS: RecordTabConfig = {
  table: 'pm_applications', noun: 'application', empty: 'No tenant applications yet', orderBy: 'created_at', ascending: false,
  defaults: { stage: 'Applied', employer_ref: 'Not started', landlord_ref: 'Not started', credit_check: 'Not started', affordability: 'Not started', right_to_rent: 'Not started' },
  fields: [
    { key: 'applicant_name', label: 'Applicant', required: true },
    { key: 'property_id', label: 'Property', type: 'property' },
    { key: 'email', label: 'Email', half: true }, { key: 'phone', label: 'Phone', half: true },
    { key: 'monthly_rent', label: 'Monthly rent', type: 'number', half: true }, { key: 'move_in_date', label: 'Move-in date', type: 'date', half: true },
    { key: 'stage', label: 'Stage', type: 'select', options: ['Applied', 'Referencing', 'Approved', 'Rejected', 'Withdrawn', 'Tenancy created'], required: true },
    { key: 'employer_ref', label: 'Employer reference', type: 'select', options: REF, half: true }, { key: 'landlord_ref', label: 'Previous landlord reference', type: 'select', options: REF, half: true },
    { key: 'credit_check', label: 'Credit check', type: 'select', options: REF, half: true }, { key: 'affordability', label: 'Affordability', type: 'select', options: REF, half: true },
    { key: 'right_to_rent', label: 'Right to rent', type: 'select', options: REF, half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Applicant', width: '1.2fr', render: r => <span style={{ fontWeight: 500, color: '#323338' }}>{r.applicant_name}</span> },
    { label: 'Property', width: '1.2fr', render: r => prop(r) },
    { label: 'Rent', width: '100px', render: (r, c) => money(c.sym(r), r.monthly_rent) },
    { label: 'Checks passed', width: '120px', render: r => `${['employer_ref', 'landlord_ref', 'credit_check', 'affordability', 'right_to_rent'].filter(k => r[k] === 'Passed').length} of 5` },
    { label: 'Stage', width: '120px', render: r => r.stage },
  ],
  actions: [
    { label: 'Approve', show: r => !['Approved', 'Tenancy created'].includes(r.stage), patch: () => ({ stage: 'Approved' }) },
    { label: 'Reject', show: r => r.stage !== 'Rejected', patch: () => ({ stage: 'Rejected' }) },
  ],
  summary: rows => [{ label: 'Open applications', value: String(rows.filter(r => ['Applied', 'Referencing'].includes(r.stage)).length) }],
}

export const METER_READINGS: RecordTabConfig = {
  table: 'pm_meter_readings', noun: 'meter reading', empty: 'No meter readings yet', orderBy: 'reading_date', ascending: false,
  defaults: { meter_type: 'Electricity' },
  fields: [
    { key: 'property_id', label: 'Property', type: 'property', required: true },
    { key: 'meter_type', label: 'Meter', type: 'select', options: ['Electricity', 'Water', 'Gas', 'Internet', 'Other'], required: true, half: true },
    { key: 'meter_number', label: 'Meter number', half: true },
    { key: 'reading', label: 'Reading', type: 'number', required: true, half: true }, { key: 'reading_date', label: 'Reading date', type: 'date', required: true, half: true },
    { key: 'read_by', label: 'Read by' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.3fr', render: r => prop(r) },
    { label: 'Meter', width: '110px', render: r => r.meter_type },
    { label: 'Meter no.', width: '110px', render: r => r.meter_number ?? '—' },
    { label: 'Reading', width: '110px', render: r => Number(r.reading).toLocaleString() },
    { label: 'Date', width: '110px', render: r => r.reading_date },
  ],
  summary: rows => [{ label: 'Readings recorded', value: String(rows.length) }],
}

export const UPKEEP: RecordTabConfig = {
  table: 'pm_upkeep', noun: 'upkeep item', empty: 'No cleaning or upkeep items yet', orderBy: 'next_date', ascending: true,
  defaults: { kind: 'Cleaning team', status: 'Active' },
  fields: [
    { key: 'kind', label: 'Type', type: 'select', options: ['Cleaning team', 'Common-area cleaning', 'Waste management', 'Groundskeeping', 'Quality check'], required: true, half: true },
    { key: 'property_id', label: 'Property', type: 'property', half: true },
    { key: 'title', label: 'What', required: true }, { key: 'team', label: 'Team or person', half: true },
    { key: 'frequency', label: 'How often', type: 'select', options: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'One-off'], half: true },
    { key: 'last_date', label: 'Last done', type: 'date', half: true }, { key: 'next_date', label: 'Next due', type: 'date', half: true },
    { key: 'score', label: 'Quality score (1 to 5)', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused', 'Ended'], half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Type', width: '150px', render: r => r.kind },
    { label: 'What', width: '1.3fr', render: r => <span style={{ fontWeight: 500, color: '#323338' }}>{r.title}{r.team ? ` · ${r.team}` : ''}</span> },
    { label: 'Property', width: '1.1fr', render: r => prop(r) },
    { label: 'Next due', width: '150px', render: (r, c) => due(r.next_date, c.today, r.status !== 'Active') },
    { label: 'Score', width: '70px', render: r => r.score ?? '—' },
  ],
  actions: [{ label: 'Done today', show: r => r.status === 'Active', patch: () => ({ last_date: new Date().toISOString().slice(0, 10) }) }],
  summary: (rows, today) => [
    { label: 'Active items', value: String(rows.filter(r => r.status === 'Active').length) },
    { label: 'Overdue', value: String(rows.filter(r => r.status === 'Active' && r.next_date && r.next_date < today).length), tone: rows.some(r => r.status === 'Active' && r.next_date && r.next_date < today) ? 'warn' : 'ok' },
  ],
}

export const BUDGETS: RecordTabConfig = {
  table: 'pm_budgets', noun: 'budget line', empty: 'No budgets yet', orderBy: 'budget_year', ascending: false,
  defaults: { budget_year: new Date().getFullYear(), category: 'Maintenance' },
  fields: [
    { key: 'property_id', label: 'Property', type: 'property' },
    { key: 'budget_year', label: 'Year', type: 'number', required: true, half: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Maintenance', 'Cleaning', 'Utilities', 'Insurance', 'Management', 'Marketing', 'Other'], required: true, half: true },
    { key: 'budget_amount', label: 'Budget', type: 'number', required: true, half: true }, { key: 'spent_amount', label: 'Spent so far', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.3fr', render: r => prop(r) },
    { label: 'Year', width: '80px', render: r => r.budget_year },
    { label: 'Category', width: '130px', render: r => r.category },
    { label: 'Budget', width: '110px', render: (r, c) => money(c.sym(r), r.budget_amount) },
    { label: 'Spent', width: '110px', render: (r, c) => money(c.sym(r), r.spent_amount) },
    { label: 'Left', width: '110px', render: (r, c) => { const left = Number(r.budget_amount || 0) - Number(r.spent_amount || 0); return <span style={{ color: left < 0 ? '#B42318' : '#344054', fontWeight: left < 0 ? 600 : 400 }}>{money(c.sym(r), left)}</span> } },
  ],
  summary: rows => [{ label: 'Over budget', value: String(rows.filter(r => Number(r.spent_amount || 0) > Number(r.budget_amount || 0)).length), tone: rows.some(r => Number(r.spent_amount || 0) > Number(r.budget_amount || 0)) ? 'warn' : 'ok' }],
}

export const SUPPLIER_AGREEMENTS: RecordTabConfig = {
  table: 'pm_supplier_agreements', noun: 'supplier agreement', empty: 'No supplier agreements yet', orderBy: 'end_date', ascending: true,
  defaults: { onboarding: 'Not started', status: 'Active' },
  fields: [
    { key: 'supplier_name', label: 'Supplier or contractor', required: true }, { key: 'service', label: 'Service', half: true },
    { key: 'property_id', label: 'Property', type: 'property', half: true },
    { key: 'start_date', label: 'Starts', type: 'date', half: true }, { key: 'end_date', label: 'Ends', type: 'date', half: true },
    { key: 'rate', label: 'Rate or terms' }, { key: 'insurance_expiry', label: 'Insurance expires', type: 'date', half: true },
    { key: 'onboarding', label: 'Onboarding', type: 'select', options: ['Not started', 'Documents requested', 'Approved'], half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Ended'], half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Supplier', width: '1.2fr', render: r => <span style={{ fontWeight: 500, color: '#323338' }}>{r.supplier_name}</span> },
    { label: 'Service', width: '1fr', render: r => r.service ?? '—' },
    { label: 'Ends', width: '150px', render: (r, c) => due(r.end_date, c.today, r.status !== 'Active') },
    { label: 'Insurance', width: '150px', render: (r, c) => due(r.insurance_expiry, c.today) },
    { label: 'Onboarding', width: '140px', render: r => r.onboarding },
  ],
  actions: [{ label: 'Approve', show: r => r.onboarding !== 'Approved', patch: () => ({ onboarding: 'Approved' }) }],
  summary: (rows, today) => [{ label: 'Ending in 60 days', value: String(rows.filter(r => r.status === 'Active' && r.end_date && days(r.end_date, today) <= 60).length) }],
}
