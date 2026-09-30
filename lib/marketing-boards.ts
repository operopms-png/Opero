// Board definitions for the Staff Centre Marketing workspace.
// Each board maps onto one of the existing marketing_* tables, so sending,
// reply tracking and open/click tracking keep working exactly as before.

export type MkOption = { value: string; color: string; label?: string }
export type MkColType = 'status' | 'text' | 'longtext' | 'date' | 'datetime' | 'number' | 'person' | 'module' | 'computed' | 'send'
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
  key: MkBoardKey
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
