import type { RecordTabConfig } from '@/components/pm/RecordTab'

// Developments list tabs. They reuse the RecordTab component; the parent is the development project.
const money = (sym: string, n: any) => (n == null || n === '' ? '—' : `${sym}${Number(n).toLocaleString()}`)
const days = (d: string, today: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
const due = (d: string | null, today: string, done = false) => {
  if (!d) return <span style={{ color: '#98A2B3' }}>—</span>
  const n = days(d, today)
  const late = !done && n < 0
  return <span style={{ color: late ? '#B42318' : '#344054', fontWeight: late ? 600 : 400 }}>{d}{late ? ` (${-n}d late)` : ''}</span>
}
const PARENT = { table: 'dev_projects', cols: 'name', label: 'project', all: 'No project' }
const NOPARENT = { table: '', cols: '', label: 'project' }
const proj = (r: any) => <span style={{ fontWeight: 500, color: '#323338' }}>{r.dev_projects?.name ?? '—'}</span>
const projField = { key: 'project_id', label: 'Project', type: 'property' as const, required: true }

export const DEV_PIPELINE: RecordTabConfig = {
  table: 'dev_pipeline', noun: 'opportunity', empty: 'No opportunities yet', orderBy: 'created_at', ascending: false, parent: NOPARENT,
  defaults: { stage: 'Lead' },
  fields: [
    { key: 'name', label: 'Opportunity', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Land', 'Existing building', 'Partnership', 'Joint venture', 'Other'], half: true },
    { key: 'stage', label: 'Stage', type: 'select', options: ['Lead', 'Appraisal', 'Offer made', 'Under contract', 'Won', 'Lost'], required: true, half: true },
    { key: 'location', label: 'Location', half: true },
    { key: 'source', label: 'Source', half: true },
    { key: 'asking_price', label: 'Asking price', type: 'number', half: true },
    { key: 'est_build_cost', label: 'Est. build cost', type: 'number', half: true },
    { key: 'est_gdv', label: 'Est. gross development value', type: 'number', half: true },
    { key: 'decision_date', label: 'Decision date', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Opportunity', width: '1.3fr', render: r => <b>{r.name}</b> },
    { label: 'Type', width: '110px', render: r => r.kind ?? '—' },
    { label: 'Stage', width: '110px', render: r => r.stage },
    { label: 'Asking', width: '110px', render: (r, c) => money(c.sym(r), r.asking_price) },
    { label: 'Est. GDV', width: '110px', render: (r, c) => money(c.sym(r), r.est_gdv) },
    { label: 'Est. margin', width: '110px', render: (r, c) => r.est_gdv ? money(c.sym(r), Number(r.est_gdv) - Number(r.asking_price || 0) - Number(r.est_build_cost || 0)) : '—' },
  ],
  summary: rows => [
    { label: 'Active', value: String(rows.filter(r => !['Won', 'Lost'].includes(r.stage)).length) },
    { label: 'Won', value: String(rows.filter(r => r.stage === 'Won').length), tone: 'ok' },
  ],
}

export const DEV_LAND: RecordTabConfig = {
  table: 'dev_land', noun: 'site', empty: 'No land or sites yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { acquisition_status: 'Identified' },
  fields: [
    { key: 'site_name', label: 'Site', required: true },
    { key: 'project_id', label: 'Project (optional)', type: 'property' },
    { key: 'location', label: 'Location', half: true },
    { key: 'ownership', label: 'Ownership', type: 'select', options: ['Owned', 'Under offer', 'Option', 'Leasehold', 'Third party'], half: true },
    { key: 'acquisition_status', label: 'Acquisition', type: 'select', options: ['Identified', 'Negotiating', 'Under contract', 'Acquired', 'Dropped'], required: true, half: true },
    { key: 'purchase_price', label: 'Purchase price', type: 'number', half: true },
    { key: 'valuation', label: 'Valuation', type: 'number', half: true },
    { key: 'valuation_date', label: 'Valuation date', type: 'date', half: true },
    { key: 'survey_status', label: 'Survey', type: 'select', options: ['Not started', 'Booked', 'Done'], half: true },
    { key: 'survey_date', label: 'Survey date', type: 'date', half: true },
    { key: 'title_ref', label: 'Title reference', half: true },
    { key: 'planning_restrictions', label: 'Planning restrictions', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Site', width: '1.3fr', render: r => <b>{r.site_name}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Ownership', width: '110px', render: r => r.ownership ?? '—' },
    { label: 'Acquisition', width: '120px', render: r => r.acquisition_status },
    { label: 'Price', width: '110px', render: (r, c) => money(c.sym(r), r.purchase_price) },
    { label: 'Valuation', width: '110px', render: (r, c) => money(c.sym(r), r.valuation) },
  ],
}

export const DEV_PLANNING: RecordTabConfig = {
  table: 'dev_planning', noun: 'application', empty: 'No planning or approvals yet', orderBy: 'submitted_date', ascending: false, parent: PARENT,
  defaults: { kind: 'Planning application', status: 'Preparing' },
  fields: [
    projField,
    { key: 'kind', label: 'Type', type: 'select', options: ['Planning application', 'Building permit', 'Zoning', 'Environmental approval', 'Utilities approval', 'Other'], required: true, half: true },
    { key: 'reference', label: 'Reference', half: true },
    { key: 'authority', label: 'Authority', half: true },
    { key: 'consultant', label: 'Consultant', half: true },
    { key: 'submitted_date', label: 'Submitted', type: 'date', half: true },
    { key: 'decision_date', label: 'Decision due', type: 'date', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Preparing', 'Submitted', 'Approved', 'Approved with conditions', 'Refused', 'Appeal'], required: true },
    { key: 'conditions', label: 'Conditions', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Project', width: '1.2fr', render: r => proj(r) },
    { label: 'Type', width: '1fr', render: r => r.kind },
    { label: 'Reference', width: '110px', render: r => r.reference ?? '—' },
    { label: 'Authority', width: '110px', render: r => r.authority ?? '—' },
    { label: 'Decision due', width: '150px', render: (r, c) => due(r.decision_date, c.today, ['Approved', 'Approved with conditions', 'Refused'].includes(r.status)) },
    { label: 'Status', width: '150px', render: r => r.status },
  ],
  summary: rows => [
    { label: 'Awaiting decision', value: String(rows.filter(r => r.status === 'Submitted').length) },
    { label: 'Approved', value: String(rows.filter(r => String(r.status).startsWith('Approved')).length), tone: 'ok' },
  ],
}

export const DEV_DESIGNS: RecordTabConfig = {
  table: 'dev_designs', noun: 'design item', empty: 'No design items yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { status: 'Draft' },
  fields: [
    projField,
    { key: 'item', label: 'Drawing / item', required: true },
    { key: 'discipline', label: 'Type', type: 'select', options: ['Architectural drawing', 'Floor plan', '3D render', 'Structural', 'MEP', 'Landscape', 'Interior', 'Other'], half: true },
    { key: 'revision', label: 'Revision', half: true },
    { key: 'designer', label: 'Designer', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Issued for review', 'Approved', 'Superseded'], required: true, half: true },
    { key: 'issued_date', label: 'Issued', type: 'date', half: true },
    { key: 'approved_date', label: 'Approved', type: 'date', half: true },
    { key: 'file_url', label: 'File link' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Item', width: '1.3fr', render: r => <b>{r.item}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Type', width: '130px', render: r => r.discipline ?? '—' },
    { label: 'Rev', width: '60px', render: r => r.revision ?? '—' },
    { label: 'Status', width: '130px', render: r => r.status },
    { label: 'File', width: '70px', render: r => r.file_url ? <a href={r.file_url} target="_blank" rel="noreferrer" style={{ color: '#2F6DB5' }}>Open</a> : '—' },
  ],
}

export const DEV_WORK_PACKAGES: RecordTabConfig = {
  table: 'dev_work_packages', noun: 'work package', empty: 'No construction work packages yet', orderBy: 'start_date', ascending: true, parent: PARENT,
  defaults: { status: 'Not started', percent_complete: 0 },
  fields: [
    projField,
    { key: 'name', label: 'Work package', required: true },
    { key: 'contractor', label: 'Contractor', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Not started', 'In progress', 'Delayed', 'Complete'], required: true, half: true },
    { key: 'start_date', label: 'Start', type: 'date', half: true },
    { key: 'end_date', label: 'Finish', type: 'date', half: true },
    { key: 'percent_complete', label: 'Percent complete', type: 'number', half: true },
    { key: 'inspection_date', label: 'Inspection date', type: 'date', half: true },
    { key: 'inspection_result', label: 'Inspection result', type: 'select', options: ['Pending', 'Passed', 'Passed with remarks', 'Failed'], half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Work package', width: '1.3fr', render: r => <b>{r.name}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Contractor', width: '1fr', render: r => r.contractor ?? '—' },
    { label: 'Finish', width: '150px', render: (r, c) => due(r.end_date, c.today, r.status === 'Complete') },
    { label: 'Progress', width: '90px', render: r => `${Number(r.percent_complete || 0)}%` },
    { label: 'Status', width: '100px', render: r => r.status },
  ],
  actions: [{ label: 'Complete', show: r => r.status !== 'Complete', patch: () => ({ status: 'Complete', percent_complete: 100 }) }],
  summary: rows => [
    { label: 'In progress', value: String(rows.filter(r => r.status === 'In progress').length) },
    { label: 'Delayed', value: String(rows.filter(r => r.status === 'Delayed').length), tone: rows.some(r => r.status === 'Delayed') ? 'warn' : undefined },
  ],
}

export const DEV_TENDERS: RecordTabConfig = {
  table: 'dev_tenders', noun: 'tender or agreement', empty: 'No tenders, quotations or agreements yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { kind: 'Tender', status: 'Open' },
  fields: [
    projField,
    { key: 'title', label: 'Title', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Tender', 'Quotation', 'Agreement'], required: true, half: true },
    { key: 'supplier', label: 'Contractor / supplier', half: true },
    { key: 'amount', label: 'Amount', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Evaluating', 'Awarded', 'Rejected', 'Signed', 'Expired'], required: true, half: true },
    { key: 'issued_date', label: 'Issued', type: 'date', half: true },
    { key: 'due_date', label: 'Closing date', type: 'date', half: true },
    { key: 'agreement_end', label: 'Agreement ends', type: 'date', half: true },
    { key: 'performance_score', label: 'Performance score (1-5)', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Title', width: '1.3fr', render: r => <b>{r.title}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Type', width: '100px', render: r => r.kind },
    { label: 'Supplier', width: '1fr', render: r => r.supplier ?? '—' },
    { label: 'Amount', width: '110px', render: (r, c) => money(c.sym(r), r.amount) },
    { label: 'Status', width: '100px', render: r => r.status },
  ],
}

export const DEV_FUNDING: RecordTabConfig = {
  table: 'dev_funding', noun: 'funding line', empty: 'No funding yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { kind: 'Loan', status: 'Proposed', drawn: 0 },
  fields: [
    projField,
    { key: 'kind', label: 'Type', type: 'select', options: ['Loan', 'Equity', 'Investor funds', 'Grant', 'Pre-sales', 'Other'], required: true, half: true },
    { key: 'source', label: 'Lender / source', half: true },
    { key: 'amount', label: 'Facility amount', type: 'number', half: true },
    { key: 'drawn', label: 'Drawn so far', type: 'number', half: true },
    { key: 'rate', label: 'Interest rate %', type: 'number', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Proposed', 'Approved', 'Drawing', 'Repaid'], required: true, half: true },
    { key: 'start_date', label: 'Start', type: 'date', half: true },
    { key: 'end_date', label: 'Repayment due', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Project', width: '1.2fr', render: r => proj(r) },
    { label: 'Type', width: '110px', render: r => r.kind },
    { label: 'Source', width: '1fr', render: r => r.source ?? '—' },
    { label: 'Facility', width: '110px', render: (r, c) => money(c.sym(r), r.amount) },
    { label: 'Drawn', width: '110px', render: (r, c) => money(c.sym(r), r.drawn) },
    { label: 'Repay by', width: '150px', render: (r, c) => due(r.end_date, c.today, r.status === 'Repaid') },
  ],
  summary: rows => [
    { label: 'Facilities', value: String(rows.reduce((a, r) => a + Number(r.amount || 0), 0).toLocaleString()) },
    { label: 'Drawn', value: String(rows.reduce((a, r) => a + Number(r.drawn || 0), 0).toLocaleString()) },
  ],
}

export const DEV_RISKS: RecordTabConfig = {
  table: 'dev_risks', noun: 'risk or check', empty: 'No risks or quality checks yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { kind: 'Risk', likelihood: 'Medium', impact: 'Medium', status: 'Open' },
  fields: [
    projField,
    { key: 'kind', label: 'Type', type: 'select', options: ['Risk', 'Quality check'], required: true, half: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Financial', 'Programme', 'Legal', 'Safety', 'Quality', 'Market', 'Other'], half: true },
    { key: 'risk', label: 'Risk / check', required: true },
    { key: 'likelihood', label: 'Likelihood', type: 'select', options: ['Low', 'Medium', 'High'], required: true, half: true },
    { key: 'impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High'], required: true, half: true },
    { key: 'owner', label: 'Owner', half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Mitigating', 'Closed'], required: true, half: true },
    { key: 'review_date', label: 'Review date', type: 'date', half: true },
    { key: 'mitigation', label: 'Mitigation', type: 'textarea' },
  ],
  columns: [
    { label: 'Risk', width: '1.4fr', render: r => <b>{r.risk}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Type', width: '110px', render: r => r.kind },
    { label: 'L / I', width: '110px', render: r => `${r.likelihood} / ${r.impact}` },
    { label: 'Review', width: '150px', render: (r, c) => due(r.review_date, c.today, r.status === 'Closed') },
    { label: 'Status', width: '100px', render: r => r.status },
  ],
  actions: [{ label: 'Close', show: r => r.status !== 'Closed', patch: () => ({ status: 'Closed' }) }],
  summary: rows => {
    const hi = rows.filter(r => r.status !== 'Closed' && r.likelihood === 'High' && r.impact === 'High').length
    return [{ label: 'Open', value: String(rows.filter(r => r.status !== 'Closed').length) }, { label: 'High / high', value: String(hi), tone: hi ? 'warn' : undefined }]
  },
}

export const DEV_PROCUREMENT: RecordTabConfig = {
  table: 'dev_procurement', noun: 'purchase', empty: 'No materials or purchase orders yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  defaults: { status: 'Requested', approval: 'Pending' },
  fields: [
    projField,
    { key: 'material', label: 'Material / item', required: true },
    { key: 'supplier', label: 'Supplier', half: true },
    { key: 'po_number', label: 'PO number', half: true },
    { key: 'quantity', label: 'Quantity', type: 'number', half: true },
    { key: 'unit_cost', label: 'Unit cost', type: 'number', half: true },
    { key: 'approval', label: 'Approval', type: 'select', options: ['Pending', 'Approved', 'Rejected'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Requested', 'Ordered', 'In transit', 'Delivered', 'Cancelled'], required: true, half: true },
    { key: 'order_date', label: 'Ordered', type: 'date', half: true },
    { key: 'delivery_date', label: 'Delivery due', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Item', width: '1.3fr', render: r => <b>{r.material}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Supplier', width: '1fr', render: r => r.supplier ?? '—' },
    { label: 'Total', width: '110px', render: (r, c) => money(c.sym(r), Number(r.quantity || 0) * Number(r.unit_cost || 0)) },
    { label: 'Delivery', width: '150px', render: (r, c) => due(r.delivery_date, c.today, r.status === 'Delivered' || r.status === 'Cancelled') },
    { label: 'Status', width: '100px', render: r => `${r.status}${r.approval === 'Pending' ? ' (approval pending)' : ''}` },
  ],
  actions: [
    { label: 'Approve', show: r => r.approval === 'Pending', patch: () => ({ approval: 'Approved' }) },
    { label: 'Delivered', show: r => r.status !== 'Delivered' && r.status !== 'Cancelled', patch: () => ({ status: 'Delivered' }) },
  ],
}

export const DEV_TEAM: RecordTabConfig = {
  table: 'dev_team', noun: 'team member', empty: 'No project team yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  fields: [
    projField,
    { key: 'person_name', label: 'Name', required: true, half: true },
    { key: 'role', label: 'Role', type: 'select', options: ['Project manager', 'Architect', 'Engineer', 'Quantity surveyor', 'Site manager', 'Contractor', 'Consultant', 'Other'], half: true },
    { key: 'company', label: 'Company', half: true },
    { key: 'allocation_pct', label: 'Allocation %', type: 'number', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'phone', label: 'Phone', half: true },
    { key: 'start_date', label: 'From', type: 'date', half: true },
    { key: 'end_date', label: 'To', type: 'date', half: true },
    { key: 'rating', label: 'Performance (1-5)', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Name', width: '1.2fr', render: r => <b>{r.person_name}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Role', width: '130px', render: r => r.role ?? '—' },
    { label: 'Company', width: '1fr', render: r => r.company ?? '—' },
    { label: 'Allocation', width: '90px', render: r => r.allocation_pct != null ? `${r.allocation_pct}%` : '—' },
    { label: 'Rating', width: '70px', render: r => r.rating ?? '—' },
  ],
}

export const DEV_HANDOVER: RecordTabConfig = {
  table: 'dev_handover', noun: 'handover item', empty: 'No handover items yet', orderBy: 'due_date', ascending: true, parent: PARENT,
  defaults: { kind: 'Handover', status: 'Pending' },
  fields: [
    projField,
    { key: 'unit', label: 'Unit', half: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Handover', 'Practical completion', 'Defects liability', 'Warranty', 'Occupancy certificate', 'Keys'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'In progress', 'Done'], required: true, half: true },
    { key: 'due_date', label: 'Due', type: 'date', half: true },
    { key: 'done_date', label: 'Done on', type: 'date', half: true },
    { key: 'document_url', label: 'Document link' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Project', width: '1.2fr', render: r => proj(r) },
    { label: 'Unit', width: '90px', render: r => r.unit ?? '—' },
    { label: 'Type', width: '1fr', render: r => r.kind },
    { label: 'Due', width: '150px', render: (r, c) => due(r.due_date, c.today, r.status === 'Done') },
    { label: 'Status', width: '100px', render: r => r.status },
  ],
  actions: [{ label: 'Done', show: r => r.status !== 'Done', patch: () => ({ status: 'Done', done_date: new Date().toISOString().slice(0, 10) }) }],
}

export const DEV_SITE_ASSESSMENTS: RecordTabConfig = {
  table: 'dev_site_assessments', noun: 'assessment', empty: 'No site assessments yet', orderBy: 'assessed_date', ascending: false, parent: PARENT,
  defaults: { kind: 'Site visit', status: 'Planned' },
  fields: [
    { key: 'site', label: 'Site', required: true },
    { key: 'project_id', label: 'Project (optional)', type: 'property' },
    { key: 'kind', label: 'Type', type: 'select', options: ['Site visit', 'Soil and ground', 'Environmental', 'Access and utilities', 'Market check', 'Other'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Planned', 'Done', 'Needs follow-up'], required: true, half: true },
    { key: 'assessor', label: 'Assessor', half: true },
    { key: 'assessed_date', label: 'Date', type: 'date', half: true },
    { key: 'findings', label: 'Findings', type: 'textarea' },
  ],
  columns: [
    { label: 'Site', width: '1.3fr', render: r => <b>{r.site}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Type', width: '150px', render: r => r.kind },
    { label: 'Date', width: '110px', render: r => r.assessed_date ?? '—' },
    { label: 'Status', width: '120px', render: r => r.status },
  ],
}

export const DEV_STOCK: RecordTabConfig = {
  table: 'dev_stock', noun: 'stock item', empty: 'No stock or materials records yet', orderBy: 'created_at', ascending: false, parent: PARENT,
  fields: [
    projField,
    { key: 'material', label: 'Material', required: true },
    { key: 'location', label: 'Stored at', half: true },
    { key: 'unit', label: 'Unit (bags, m, tonnes)', half: true },
    { key: 'qty_in', label: 'Received', type: 'number', half: true },
    { key: 'qty_used', label: 'Used', type: 'number', half: true },
    { key: 'reorder_level', label: 'Reorder at', type: 'number', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Material', width: '1.3fr', render: r => <b>{r.material}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Stored at', width: '1fr', render: r => r.location ?? '—' },
    { label: 'In / used', width: '110px', render: r => `${Number(r.qty_in || 0)} / ${Number(r.qty_used || 0)}` },
    { label: 'On hand', width: '110px', render: r => {
      const n = Number(r.qty_in || 0) - Number(r.qty_used || 0)
      const low = r.reorder_level != null && n <= Number(r.reorder_level)
      return <span style={{ color: low ? '#B42318' : '#344054', fontWeight: low ? 600 : 400 }}>{n} {r.unit ?? ''}{low ? ' (reorder)' : ''}</span>
    } },
  ],
  summary: rows => {
    const low = rows.filter(r => r.reorder_level != null && Number(r.qty_in || 0) - Number(r.qty_used || 0) <= Number(r.reorder_level)).length
    return [{ label: 'Items', value: String(rows.length) }, { label: 'To reorder', value: String(low), tone: low ? 'warn' : undefined }]
  },
}

export const DEV_SCHEDULES: RecordTabConfig = {
  table: 'dev_schedules', noun: 'shift', empty: 'No team schedule yet', orderBy: 'work_date', ascending: true, parent: PARENT,
  fields: [
    projField,
    { key: 'person_name', label: 'Person', required: true, half: true },
    { key: 'role', label: 'Role', half: true },
    { key: 'work_date', label: 'Date', type: 'date', required: true, half: true },
    { key: 'task', label: 'Task', half: true },
    { key: 'start_time', label: 'Start (e.g. 08:00)', half: true },
    { key: 'end_time', label: 'End (e.g. 16:00)', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Date', width: '120px', render: r => r.work_date ?? '—' },
    { label: 'Person', width: '1fr', render: r => <b>{r.person_name}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Task', width: '1fr', render: r => r.task ?? '—' },
    { label: 'Hours', width: '120px', render: r => r.start_time ? `${r.start_time}-${r.end_time ?? ''}` : '—' },
  ],
}

export const DEV_INSURANCE: RecordTabConfig = {
  table: 'dev_insurance', noun: 'policy or regulation', empty: 'No insurance or building regulations records yet', orderBy: 'expiry_date', ascending: true, parent: PARENT,
  defaults: { kind: 'Construction insurance', status: 'Active' },
  fields: [
    projField,
    { key: 'title', label: 'Title', required: true },
    { key: 'kind', label: 'Type', type: 'select', options: ['Construction insurance', 'Public liability', 'Employers liability', 'Building regulations', 'Quality assurance', 'Environmental compliance', 'Other'], required: true, half: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Pending', 'Expired', 'Cancelled'], required: true, half: true },
    { key: 'provider', label: 'Provider / authority', half: true },
    { key: 'reference', label: 'Policy / reference', half: true },
    { key: 'cover_amount', label: 'Cover amount', type: 'number', half: true },
    { key: 'start_date', label: 'Starts', type: 'date', half: true },
    { key: 'expiry_date', label: 'Expires', type: 'date', half: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  columns: [
    { label: 'Title', width: '1.3fr', render: r => <b>{r.title}</b> },
    { label: 'Project', width: '1fr', render: r => proj(r) },
    { label: 'Type', width: '170px', render: r => r.kind },
    { label: 'Cover', width: '110px', render: (r, c) => money(c.sym(r), r.cover_amount) },
    { label: 'Expires', width: '150px', render: (r, c) => due(r.expiry_date, c.today, r.status !== 'Active') },
    { label: 'Status', width: '90px', render: r => r.status },
  ],
}
