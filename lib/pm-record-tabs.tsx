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
