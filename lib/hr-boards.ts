import type { MkBoard } from './marketing-boards'

// Staff Centre → People & HR boards (one per hr_* table), shown with the
// shared CRM-style board components. 'employees' refs = the Employees board.
const EMP = (key = 'employee_id', title = 'Employee') => ({ key, title, type: 'ref' as const, ref: 'employees', width: 220 })

export const HR_BOARDS: MkBoard[] = [
  {
    key: 'employees', table: 'hr_employees', title: 'Employees', item: 'employee', nameField: 'full_name', groupBy: 'status',
    dateField: 'start_date',
    defaults: { full_name: 'New employee', status: 'Active', employment_type: 'Full-Time' },
    cols: [
      { key: 'role', title: 'Role', type: 'text', width: 190 },
      { key: 'department', title: 'Department', type: 'text', width: 170 },
      { key: 'employment_type', title: 'Type', type: 'status', width: 130, options: [
        { value: 'Full-Time', color: '#00C875' }, { value: 'Part-Time', color: '#FDAB3D' }, { value: 'Contractor', color: '#9D50DD' }] },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [
        { value: 'Active', color: '#00C875' }, { value: 'On Leave', color: '#FDAB3D' }, { value: 'Terminated', color: '#C4C4C4' }] },
      { key: 'start_date', title: 'Start date', type: 'date', width: 130 },
      { key: 'end_date', title: 'End date', type: 'date', width: 130 },
      { key: 'email', title: 'Email', type: 'email', width: 210 },
      { key: 'phone', title: 'Phone', type: 'phone', width: 140 },
      { key: 'salary', title: 'Salary', type: 'number', width: 120, currency: '£' },
      { key: 'notes', title: 'Notes', type: 'longtext', width: 220, hideInTable: true },
    ],
  },
  {
    key: 'onboarding', table: 'hr_onboarding_tasks', title: 'Onboarding', item: 'task', nameField: 'task', groupBy: 'status',
    dateField: 'due_date',
    defaults: { task: 'New onboarding task', status: 'Pending' },
    cols: [
      EMP(),
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [{ value: 'Pending', color: '#FDAB3D' }, { value: 'Complete', color: '#00C875' }] },
      { key: 'due_date', title: 'Due', type: 'date', width: 130 },
      { key: 'completed_date', title: 'Completed', type: 'date', width: 130 },
    ],
  },
  {
    key: 'reviews', table: 'hr_performance_reviews', title: 'Performance reviews', item: 'review', nameField: 'employee_id', nameRef: 'employee_id', groupBy: 'employee_id',
    dateField: 'review_date',
    defaults: {},
    cols: [
      { ...EMP(), hideInTable: true },
      { key: 'review_date', title: 'Review date', type: 'date', width: 130 },
      { key: 'reviewer', title: 'Reviewer', type: 'text', width: 170 },
      { key: 'rating', title: 'Rating (out of 5)', type: 'number', width: 140 },
      { key: 'stars', title: 'Stars', type: 'computed', width: 120 },
      { key: 'strengths', title: 'Strengths', type: 'longtext', width: 220, hideInTable: true },
      { key: 'improvements', title: 'Improvements', type: 'longtext', width: 220, hideInTable: true },
      { key: 'goals', title: 'Goals', type: 'longtext', width: 220, hideInTable: true },
    ],
  },
  {
    key: 'training', table: 'hr_training_records', title: 'Training', item: 'training record', nameField: 'training_name', groupBy: 'status',
    dateField: 'expiry_date',
    defaults: { training_name: 'New training', status: 'Scheduled' },
    cols: [
      EMP(),
      { key: 'provider', title: 'Provider', type: 'text', width: 170 },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [{ value: 'Scheduled', color: '#579BFC' }, { value: 'Completed', color: '#00C875' }, { value: 'Expired', color: '#DF2F4A' }] },
      { key: 'completed_date', title: 'Completed', type: 'date', width: 130 },
      { key: 'expiry_date', title: 'Expires', type: 'date', width: 130 },
      { key: 'expiry_flag', title: 'Expiry', type: 'computed', width: 130 },
      { key: 'certificate_url', title: 'Certificate', type: 'url', width: 120 },
    ],
  },
  {
    key: 'discipline', table: 'hr_discipline_records', title: 'Discipline', item: 'record', nameField: 'employee_id', nameRef: 'employee_id', groupBy: 'type',
    dateField: 'date_issued',
    defaults: { type: 'Verbal Warning' },
    cols: [
      { ...EMP(), hideInTable: true },
      { key: 'type', title: 'Type', type: 'status', width: 220, options: [
        { value: 'Verbal Warning', color: '#FDAB3D' }, { value: 'Written Warning', color: '#FF642E' }, { value: 'Final Warning', color: '#DF2F4A' },
        { value: 'Performance Improvement Plan', color: '#9D50DD' }, { value: 'Other', color: '#C4C4C4' }] },
      { key: 'date_issued', title: 'Issued', type: 'date', width: 130 },
      { key: 'issued_by', title: 'Issued by', type: 'text', width: 160 },
      { key: 'document_url', title: 'Document', type: 'url', width: 120 },
      { key: 'reason', title: 'Reason', type: 'longtext', width: 220, hideInTable: true },
      { key: 'resolution', title: 'Resolution', type: 'longtext', width: 220, hideInTable: true },
    ],
  },
  {
    key: 'time', table: 'hr_time_entries', title: 'Time tracking', item: 'time entry', nameField: 'employee_id', nameRef: 'employee_id', groupBy: 'employee_id',
    dateField: 'entry_date',
    defaults: {},
    cols: [
      { ...EMP(), hideInTable: true },
      { key: 'entry_date', title: 'Date', type: 'date', width: 130 },
      { key: 'clock_in', title: 'Clock in', type: 'text', width: 110 },
      { key: 'clock_out', title: 'Clock out', type: 'text', width: 110 },
      { key: 'hours', title: 'Hours', type: 'number', width: 100 },
      { key: 'notes', title: 'Notes', type: 'text', width: 240 },
    ],
  },
  {
    key: 'requests', table: 'hr_requests', title: 'HR requests', item: 'request', nameField: 'title', groupBy: 'status',
    dateField: 'start_date', endField: 'end_date',
    defaults: { title: 'New request', type: 'Holiday', status: 'Pending' },
    cols: [
      EMP(),
      { key: 'type', title: 'Type', type: 'status', width: 130, options: [
        { value: 'Holiday', color: '#00C875' }, { value: 'Sick Leave', color: '#FDAB3D' }, { value: 'Expense', color: '#579BFC' }, { value: 'General', color: '#C4C4C4' }] },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [{ value: 'Pending', color: '#FDAB3D' }, { value: 'Approved', color: '#00C875' }, { value: 'Denied', color: '#DF2F4A' }] },
      { key: 'start_date', title: 'From', type: 'date', width: 130 },
      { key: 'end_date', title: 'To', type: 'date', width: 130 },
      { key: 'resolved_by', title: 'Decided by', type: 'text', width: 150 },
      { key: 'resolved_date', title: 'Decided on', type: 'date', width: 130 },
      { key: 'description', title: 'Details', type: 'longtext', width: 220, hideInTable: true },
    ],
  },
  {
    key: 'goals', table: 'hr_company_goals', title: 'Company goals', item: 'goal', nameField: 'title', groupBy: 'status',
    dateField: 'target_date',
    defaults: { title: 'New goal', status: 'Not Started', progress_pct: 0 },
    cols: [
      EMP('owner_employee_id', 'Owner'),
      { key: 'status', title: 'Status', type: 'status', width: 140, options: [
        { value: 'Not Started', color: '#C4C4C4' }, { value: 'In Progress', color: '#FDAB3D' }, { value: 'Achieved', color: '#00C875' }, { value: 'Missed', color: '#DF2F4A' }] },
      { key: 'progress_pct', title: 'Progress %', type: 'number', width: 120 },
      { key: 'progress_bar', title: 'Progress', type: 'computed', width: 160 },
      { key: 'target_date', title: 'Target date', type: 'date', width: 130 },
      { key: 'description', title: 'Description', type: 'longtext', width: 220, hideInTable: true },
    ],
  },
]
export const hrBoard = (k: string) => HR_BOARDS.find(b => b.key === k)
