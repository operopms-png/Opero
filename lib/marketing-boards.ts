// Board definitions for the Staff Centre Marketing workspace.
// Each board maps onto one of the existing marketing_* tables, so sending,
// reply tracking and open/click tracking keep working exactly as before.

export type MkOption = { value: string; color: string; label?: string }
export type MkColType = 'status' | 'text' | 'longtext' | 'date' | 'datetime' | 'number' | 'person' | 'module' | 'computed' | 'send' | 'url' | 'email' | 'phone'
export type MkCol = {
  key: string            // db field (or computed key)
  title: string
  type: MkColType
  width: number
  options?: MkOption[]
  currency?: string
  readonlyWhen?: (row: any) => boolean
  hideInTable?: boolean
}
export type MkBoardKey = 'campaigns' | 'emails' | 'social' | 'ads' | 'templates'
export type MkBoard = {
  key: string
  table: string
  title: string
  item: string            // singular noun
  nameField: string
  groupBy: string         // default grouping column (an option column)
  dateField?: string      // for the calendar view
  endField?: string
  cols: MkCol[]
  defaults: Record<string, any>
}

export const MODULES: MkOption[] = [
  { value: 'pm', label: 'Property Management', color: '#D0AE4C' },
  { value: 'str', label: 'Vacation Rentals', color: '#00C875' },
  { value: 'estate', label: 'Estate Agency', color: '#FDAB3D' },
  { value: 'dev', label: 'Developments', color: '#8A6B2E' },
]
export const moduleLabel = (v: string) => MODULES.find(m => m.value === v)?.label ?? v ?? ''

const DRAFT = '#C4C4C4', LIVE = '#00C875', AMBER = '#FDAB3D', DONE = '#8A6B2E', RED = '#DF2F4A'

export const BOARDS: MkBoard[] = [
  {
    key: 'campaigns', table: 'marketing_campaigns', title: 'Campaigns', item: 'campaign', nameField: 'name', groupBy: 'status',
    dateField: 'start_date', endField: 'end_date',
    defaults: { name: 'New campaign', type: 'Email', status: 'Draft' },
    cols: [
      { key: 'owner', title: 'Owner', type: 'person', width: 90 },
      { key: 'type', title: 'Type', type: 'status', width: 130, options: [
        { value: 'Email', color: '#D0AE4C' }, { value: 'Social', color: '#9D50DD' }, { value: 'Ads', color: '#579BFC' },
        { value: 'SMS', color: '#66CCFF' }, { value: 'Multi-channel', color: '#784BD1' }] },
      { key: 'module', title: 'Module', type: 'module', width: 170 },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [
        { value: 'Draft', color: DRAFT }, { value: 'Active', color: LIVE }, { value: 'Paused', color: AMBER }, { value: 'Completed', color: DONE }] },
      { key: 'audience', title: 'Audience', type: 'text', width: 170 },
      { key: 'budget', title: 'Budget', type: 'number', width: 110, currency: '£' },
      { key: 'start_date', title: 'Start', type: 'date', width: 120 },
      { key: 'end_date', title: 'End', type: 'date', width: 120 },
      { key: 'notes', title: 'Notes', type: 'longtext', width: 200 },
    ],
  },
  {
    key: 'emails', table: 'marketing_emails', title: 'Emails', item: 'email', nameField: 'subject', groupBy: 'status',
    dateField: 'scheduled_at',
    defaults: { subject: 'New email', status: 'Draft', body: '' },
    cols: [
      { key: 'owner', title: 'Owner', type: 'person', width: 90 },
      { key: 'to_recipient', title: 'To', type: 'text', width: 210, readonlyWhen: r => r.status === 'Sent' },
      { key: 'module', title: 'Module', type: 'module', width: 170 },
      { key: 'status', title: 'Status', type: 'status', width: 130, readonlyWhen: r => r.status === 'Sent', options: [
        { value: 'Draft', color: DRAFT }, { value: 'Scheduled', color: AMBER }, { value: 'Sent', color: LIVE }] },
      { key: 'scheduled_at', title: 'Send date', type: 'datetime', width: 150, readonlyWhen: r => r.status === 'Sent' },
      { key: 'sent_at', title: 'Sent', type: 'computed', width: 130 },
      { key: 'delivered', title: 'Delivered', type: 'computed', width: 100 },
      { key: 'opens', title: 'Opens', type: 'computed', width: 80 },
      { key: 'clicks', title: 'Clicks', type: 'computed', width: 80 },
      { key: 'replies', title: 'Replies', type: 'computed', width: 80 },
      { key: 'send', title: 'Send', type: 'send', width: 100 },
    ],
  },
  {
    key: 'social', table: 'marketing_socials', title: 'Social posts', item: 'post', nameField: 'caption', groupBy: 'status',
    dateField: 'scheduled_at',
    defaults: { caption: 'New post', platform: 'Instagram', status: 'Draft' },
    cols: [
      { key: 'owner', title: 'Owner', type: 'person', width: 90 },
      { key: 'platform', title: 'Platform', type: 'status', width: 130, options: [
        { value: 'Instagram', color: '#FF5AC4' }, { value: 'Facebook', color: '#579BFC' }, { value: 'LinkedIn', color: '#0086C0' },
        { value: 'TikTok', color: '#401694' }, { value: 'Twitter/X', color: '#757575' }] },
      { key: 'module', title: 'Module', type: 'module', width: 170 },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [
        { value: 'Draft', color: DRAFT }, { value: 'Scheduled', color: AMBER }, { value: 'Published', color: LIVE }] },
      { key: 'scheduled_at', title: 'Scheduled', type: 'datetime', width: 150 },
      { key: 'link', title: 'Link', type: 'text', width: 200 },
    ],
  },
  {
    key: 'ads', table: 'marketing_ads', title: 'Ads', item: 'ad', nameField: 'name', groupBy: 'status',
    dateField: 'start_date', endField: 'end_date',
    defaults: { name: 'New ad', platform: 'Google', status: 'Draft' },
    cols: [
      { key: 'owner', title: 'Owner', type: 'person', width: 90 },
      { key: 'platform', title: 'Platform', type: 'status', width: 130, options: [
        { value: 'Google', color: '#00C875' }, { value: 'Facebook', color: '#579BFC' }, { value: 'Instagram', color: '#FF5AC4' },
        { value: 'TikTok', color: '#401694' }, { value: 'LinkedIn', color: '#0086C0' }] },
      { key: 'module', title: 'Module', type: 'module', width: 170 },
      { key: 'status', title: 'Status', type: 'status', width: 130, options: [
        { value: 'Draft', color: DRAFT }, { value: 'Active', color: LIVE }, { value: 'Paused', color: AMBER }, { value: 'Ended', color: DONE }] },
      { key: 'budget', title: 'Budget', type: 'number', width: 110, currency: '£' },
      { key: 'clicks', title: 'Clicks', type: 'number', width: 90 },
      { key: 'impressions', title: 'Impressions', type: 'number', width: 110 },
      { key: 'ctr', title: 'CTR', type: 'computed', width: 80 },
      { key: 'start_date', title: 'Start', type: 'date', width: 120 },
      { key: 'end_date', title: 'End', type: 'date', width: 120 },
    ],
  },
  {
    key: 'templates', table: 'marketing_email_templates', title: 'Email templates', item: 'template', nameField: 'name', groupBy: 'category',
    defaults: { name: 'New template', category: 'Other', subject: 'Subject line', body: '' },
    cols: [
      { key: 'category', title: 'Category', type: 'status', width: 170, options: [
        { value: 'Onboarding', color: '#00C875' }, { value: 'Rent & Payments', color: '#D0AE4C' }, { value: 'Maintenance', color: '#FDAB3D' },
        { value: 'Renewals', color: '#579BFC' }, { value: 'Announcements', color: '#9D50DD' }, { value: 'Landlord Acquisition', color: '#8A6B2E' },
        { value: 'Other', color: '#C4C4C4' }] },
      { key: 'module', title: 'Module', type: 'module', width: 170 },
      { key: 'subject', title: 'Subject', type: 'text', width: 280 },
    ],
  },
]

// What the shared board components (table, Kanban, calendar, item panel) need
// from a data store. useMarketing and useApplications both provide it.
export interface BoardStore {
  rows: Record<string, any[]>
  replies: Record<string, any[]>
  events: any[]
  people: string[]
  stats: Record<string, { delivered: boolean; opened: number; clicked: number; bounced: boolean; replies: number }>
  sendingId: string | null
  update(k: string, id: string, patch: Record<string, any>): Promise<void>
  add(k: string, values: Record<string, any>): Promise<any>
  remove(k: string, ids: string[]): Promise<void>
  duplicate(k: string, ids: string[]): Promise<void>
  sendEmail(id: string): Promise<void>
}

export const boardByKey = (k: string) => BOARDS.find(b => b.key === k)
export const optionCols = (b: MkBoard) => b.cols.filter(c => c.type === 'status' || c.type === 'module' || c.type === 'person')
export function optionsOf(c: MkCol | undefined, people: string[] = []): MkOption[] {
  if (!c) return []
  if (c.type === 'module') return MODULES
  if (c.type === 'person') return people.map(p => ({ value: p, color: '#D0AE4C' }))
  return c.options ?? []
}
export const RED_ = RED

export function fmtDate(d: any, withTime = false) {
  if (!d) return ''
  const x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d)
  if (Number.isNaN(x.getTime())) return ''
  const s = x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return withTime ? `${s}, ${x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : s
}
export function money(n: any, cur = '£') {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return ''
  return cur + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 })
}

// Staff Centre → Applications uses the same board components.
export const APPLICATIONS_BOARD: MkBoard = {
  key: 'applications', table: 'job_applications', title: 'Applications', item: 'candidate', nameField: 'candidate_name', groupBy: 'stage',
  dateField: 'interview_at',
  defaults: { candidate_name: 'New candidate', role_applied: 'Role to confirm', stage: 'Applied', module: '' },
  cols: [
    { key: 'owner', title: 'Owner', type: 'person', width: 90 },
    { key: 'role_applied', title: 'Role', type: 'text', width: 200 },
    { key: 'stage', title: 'Stage', type: 'status', width: 140, options: [
      { value: 'Applied', color: '#579BFC' }, { value: 'Interviewing', color: '#FDAB3D' }, { value: 'Offered', color: '#9D50DD' },
      { value: 'Hired', color: '#00C875' }, { value: 'Rejected', color: '#DF2F4A' }] },
    { key: 'module', title: 'Department', type: 'status', width: 170, options: [
      { value: '', label: 'General / Other', color: '#C4C4C4' },
      { value: 'str', label: 'Vacation Rentals', color: '#D0AE4C' }, { value: 'pm', label: 'Property Management', color: '#579BFC' },
      { value: 'estate', label: 'Estate Agency', color: '#00C875' }, { value: 'dev', label: 'Developments', color: '#9D50DD' }] },
    { key: 'email', title: 'Email', type: 'email', width: 210 },
    { key: 'phone', title: 'Phone', type: 'phone', width: 140 },
    { key: 'interview_at', title: 'Interview', type: 'datetime', width: 160 },
    { key: 'resume_url', title: 'CV link', type: 'url', width: 110 },
    { key: 'created_at', title: 'Applied on', type: 'computed', width: 120 },
    { key: 'notes', title: 'Notes', type: 'longtext', width: 220, hideInTable: true },
  ],
}

// Staff Centre → Staff Performance: each row is a win. Wins logged from CRM
// deals (Closed won) are kept in step by the database: the staff member is set on
// the deal, and editing the value here also updates the deal's Price.
const autoWin = (r: any) => String(r.notes ?? '').startsWith('Auto-logged from CRM')
export const WINS_BOARD: MkBoard = {
  key: 'wins', table: 'staff_performance_wins', title: 'Wins', item: 'win', nameField: 'title', groupBy: 'category',
  dateField: 'date_achieved',
  defaults: { title: 'New win', category: 'Deal Closed', staff_name: 'Unassigned' },
  cols: [
    { key: 'staff_name', title: 'Staff member', type: 'person', width: 160, readonlyWhen: autoWin },
    { key: 'category', title: 'Category', type: 'status', width: 230, options: [
      { value: 'Deal Closed', color: '#A8862E' },
      { value: 'Client Onboarded (Short-Term)', label: 'Client Onboarded — Short-Term', color: '#00C875' },
      { value: 'Client Onboarded (Long-Term)', label: 'Client Onboarded — Long-Term', color: '#037F4C' },
      { value: 'Joint Venture Secured', color: '#9D50DD' },
      { value: 'Investor Secured', color: '#FDAB3D' },
      { value: 'Tenant Secured', label: 'Tenant Secured (Vacancy Filled)', color: '#579BFC' }] },
    { key: 'value', title: 'Value', type: 'number', width: 120, currency: '£' },
    { key: 'module', title: 'Department', type: 'status', width: 170, options: [
      { value: 'str', label: 'Vacation Rentals', color: '#D0AE4C' }, { value: 'pm', label: 'Property Management', color: '#579BFC' },
      { value: 'estate', label: 'Estate Agency', color: '#00C875' }, { value: 'dev', label: 'Developments', color: '#9D50DD' }] },
    { key: 'date_achieved', title: 'Date', type: 'date', width: 130 },
    { key: 'source', title: 'Source', type: 'computed', width: 150 },
    { key: 'notes', title: 'Notes', type: 'longtext', width: 220, hideInTable: true, readonlyWhen: autoWin },
  ],
}
