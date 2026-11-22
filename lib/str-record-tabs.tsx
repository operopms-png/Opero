import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Vacation Rentals list tabs. They reuse RecordTab; the parent is the property.
const money = (sym: string, n: any) => (n == null || n === '' ? '—' : `${sym}${Number(n).toLocaleString()}`)
const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
const due = (d: string | null, today: string, done = false) => {
  if (!d) return <span style={{ color: '#98A2B3' }}>—</span>
  const late = !done && days(d, today) < 0
  return <span style={{ color: late ? '#B42318' : '#344054', fontWeight: late ? 600 : 400 }}>{d}{late ? ` (${-days(d, today)}d late)` : ''}</span>
}
const PARENT = { table: 'properties', cols: 'name', label: 'property', all: 'All properties' }
const prop = (r: any) => <span style={{ fontWeight: 500, color: '#323338' }}>{r.properties?.name ?? 'All properties'}</span>
const propField = { key: 'property_id', label: 'Property', type: 'property' as const }

export const STR_REQUESTS: RecordTabConfig = {
  table: 'str_requests', noun: 'guest request', empty: 'No guest requests yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { kind: 'Early check-in', status: 'Open' },
  fields: [
    propField,
    { key: 'guest_name', label: 'Guest', required: true, half: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Early check-in', 'Late check-out', 'Complaint', 'Upsell or extra service', 'Special request', 'Other'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Approved', 'Declined', 'Resolved'], required: true, half: true },
    { key: 'request_date', label: 'Date', type: 'date', half: true },
    { key: 'handled_by', label: 'Handled by', half: true },
    { key: 'amount', label: 'Amount charged', type: 'number', half: true },
    { key: 'notes', label: 'Details', type: 'textarea' },
  ],
  columns: [
    { label: 'Guest', width: '1fr', render: r => <b>{r.guest_name}</b> },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Type', width: '170px', render: r => r.kind },
    { label: 'Date', width: '110px', render: r => r.request_date ?? '—' },
    { label: 'Status', width: '110px', render: r => r.status },
  ],
  actions: [{ label: 'Resolve', show: r => !['Resolved', 'Declined'].includes(r.status), patch: () => ({ status: 'Resolved' }) }],
  summary: rows => [
    { label: 'Open', value: String(rows.filter(r => ['Open', 'In progress'].includes(r.status)).length) },
    { label: 'Complaints open', value: String(rows.filter(r => r.kind === 'Complaint' && !['Resolved', 'Declined'].includes(r.status)).length), tone: rows.some(r => r.kind === 'Complaint' && !['Resolved', 'Declined'].includes(r.status)) ? 'warn' : undefined },
    { label: 'Upsell revenue', value: String(rows.filter(r => r.kind === 'Upsell or extra service').reduce((a, r) => a + Number(r.amount || 0), 0).toLocaleString()) },
  ],
}

export const STR_INVENTORY: RecordTabConfig = {
  table: 'str_inventory', noun: 'inventory item', empty: 'No inventory yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { category: 'Furniture and appliances', condition: 'Good', quantity: 1 },
  fields: [
    propField,
    { key: 'item', label: 'Item', required: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Furniture and appliances', 'Linen and towels', 'Toiletries and guest supplies', 'Kitchenware', 'Other'], required: true, half: true },
    { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Good', 'Worn', 'Needs replacing'], required: true, half: true },
    { key: 'quantity', label: 'Quantity in stock', type: 'number', half: true },
    { key: 'reorder_level', label: 'Reorder at', type: 'number', half: true },
    { key: 'last_checked', label: 'Last checked', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Item', width: '1.3fr', render: r => <b>{r.item}</b> },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Category', width: '190px', render: r => r.category },
    { label: 'Stock', width: '110px', render: r => { const low = r.reorder_level != null && Number(r.quantity || 0) <= Number(r.reorder_level); return <span style={{ color: low ? '#B42318' : '#344054', fontWeight: low ? 600 : 400 }}>{Number(r.quantity || 0)}{low ? ' (reorder)' : ''}</span> } },
    { label: 'Condition', width: '120px', render: r => r.condition },
  ],
  summary: rows => {
    const low = rows.filter(r => r.reorder_level != null && Number(r.quantity || 0) <= Number(r.reorder_level)).length
    const rep = rows.filter(r => r.condition === 'Needs replacing').length
    return [{ label: 'To reorder', value: String(low), tone: low ? 'warn' : undefined }, { label: 'To replace', value: String(rep), tone: rep ? 'warn' : undefined }]
  },
}

export const STR_LAUNDRY: RecordTabConfig = {
  table: 'str_laundry', noun: 'laundry load', empty: 'No laundry records yet', orderBy: 'sent_date', ascending: false, parent: PARENT,
  defaults: { status: 'Sent' },
  fields: [
    propField,
    { key: 'provider', label: 'Laundry provider', half: true },
    { key: 'items', label: 'Items (e.g. 6 sheets, 12 towels)', half: true },
    { key: 'sent_date', label: 'Sent', type: 'date', half: true },
    { key: 'returned_date', label: 'Returned', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Sent', 'Returned', 'Missing items'], required: true, half: true },
    { key: 'cost', label: 'Cost', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Provider', width: '1fr', render: r => <b>{r.provider ?? '—'}</b> },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Items', width: '1.2fr', render: r => r.items ?? '—' },
    { label: 'Sent', width: '110px', render: r => r.sent_date ?? '—' },
    { label: 'Returned', width: '130px', render: (r, c) => due(r.returned_date ?? null, c.today, r.status !== 'Sent') },
    { label: 'Status', width: '110px', render: r => r.status },
  ],
  actions: [{ label: 'Returned', show: r => r.status === 'Sent', patch: () => ({ status: 'Returned', returned_date: new Date().toISOString().slice(0, 10) }) }],
}

export const STR_INSPECTIONS: RecordTabConfig = {
  table: 'str_inspections', noun: 'inspection', empty: 'No inspections yet', orderBy: 'inspection_date', ascending: false, parent: PARENT,
  defaults: { kind: 'Routine', condition: 'Good', status: 'Planned' },
  fields: [
    propField,
    { key: 'kind', label: 'Type', type: 'select', options: ['Pre-arrival', 'Post-departure', 'Routine', 'Inventory check', 'Damage report'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Done', 'Needs follow-up'], required: true, half: true },
    { key: 'inspection_date', label: 'Date', type: 'date', half: true },
    { key: 'inspector', label: 'Inspector', half: true },
    { key: 'condition', label: 'Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'], half: true },
    { key: 'photo_url', label: 'Photo or report link', half: true },
    { key: 'damage_notes', label: 'Condition notes and damage', type: 'textarea' },
  ],
  columns: [
    { label: 'Property', width: '1.2fr', render: r => prop(r) },
    { label: 'Type', width: '140px', render: r => r.kind },
    { label: 'Date', width: '110px', render: r => r.inspection_date ?? '—' },
    { label: 'Condition', width: '100px', render: r => r.condition ?? '—' },
    { label: 'Damage', width: '70px', render: r => r.damage_notes ? 'Yes' : '—' },
    { label: 'Status', width: '120px', render: r => r.status },
  ],
  actions: [{ label: 'Done', show: r => r.status !== 'Done', patch: () => ({ status: 'Done' }) }],
}

export const STR_PRICING_RULES: RecordTabConfig = {
  table: 'str_pricing_rules', noun: 'pricing rule', empty: 'No pricing rules yet', orderBy: 'start_date', ascending: true, parent: PARENT,
  defaults: { kind: 'Seasonal rate' },
  fields: [
    propField,
    { key: 'name', label: 'Rule name', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Seasonal rate', 'Discount', 'Promotion', 'Minimum stay', 'Occupancy target'], required: true, half: true },
    { key: 'nightly_rate', label: 'Nightly rate', type: 'number', half: true },
    { key: 'adjust_pct', label: 'Adjust % (e.g. -10 or 15)', type: 'number', half: true },
    { key: 'min_nights', label: 'Minimum nights', type: 'number', half: true },
    { key: 'target_occupancy', label: 'Target occupancy %', type: 'number', half: true },
    { key: 'start_date', label: 'From', type: 'date', half: true },
    { key: 'end_date', label: 'To', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Rule', width: '1.3fr', render: r => <b>{r.name}</b> },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Type', width: '140px', render: r => r.kind },
    { label: 'Rate / adjust', width: '130px', render: (r, c) => r.nightly_rate != null ? money(c.sym(r), r.nightly_rate) : r.adjust_pct != null ? `${r.adjust_pct}%` : r.min_nights != null ? `${r.min_nights} nights` : r.target_occupancy != null ? `${r.target_occupancy}%` : '—' },
    { label: 'Dates', width: '200px', render: r => r.start_date ? `${r.start_date} to ${r.end_date ?? 'open'}` : 'All year' },
  ],
}

export const STR_OWNER_AGREEMENTS: RecordTabConfig = {
  table: 'str_owner_agreements', noun: 'agreement', empty: 'No owner or co-host agreements yet', orderBy: 'end_date', ascending: true, parent: PARENT,
  defaults: { kind: 'Management agreement', status: 'Active' },
  fields: [
    propField,
    { key: 'owner_name', label: 'Owner or co-host', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Management agreement', 'Co-host agreement'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Active', 'Ended'], required: true, half: true },
    { key: 'fee_pct', label: 'Fee or split %', type: 'number', half: true },
    { key: 'start_date', label: 'Starts', type: 'date', half: true },
    { key: 'end_date', label: 'Ends', type: 'date', half: true },
    { key: 'notes', label: 'Terms and notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Owner / co-host', width: '1.2fr', render: r => <b>{r.owner_name}</b> },
    { label: 'Property', width: '1fr', render: r => prop(r) },
    { label: 'Type', width: '170px', render: r => r.kind },
    { label: 'Fee', width: '70px', render: r => r.fee_pct != null ? `${r.fee_pct}%` : '—' },
    { label: 'Ends', width: '150px', render: (r, c) => due(r.end_date ?? null, c.today, r.status !== 'Active') },
    { label: 'Status', width: '80px', render: r => r.status },
  ],
}
