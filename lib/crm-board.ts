// Shared types and helpers for the CRM boards (Staff Centre → CRM).
// Data lives in crm_boards / crm_board_columns / crm_board_groups / crm_board_items.

export type ColumnType =
  | 'text' | 'status' | 'date' | 'person' | 'number' | 'phone' | 'email'
  | 'url' | 'checkbox' | 'location' | 'file' | 'link' | 'formula'

export type Label = { id: string; label: string; color: string }

export type Board = { id: string; user_id: string; name: string; kind: string; item_label: string; position: number; created_at: string }
export type Column = { id: string; board_id: string; user_id: string; key: string | null; title: string; type: ColumnType; settings: any; position: number; width: number }
export type Group = { id: string; board_id: string; user_id: string; key: string | null; title: string; color: string; position: number; collapsed: boolean }
export type Item = { id: string; board_id: string; group_id: string | null; user_id: string; name: string; values: Record<string, any>; position: number; crm_contact_id: string | null; crm_deal_id: string | null; created_at: string; updated_at: string }
export type Person = { id: string; name: string; email?: string }
export type FileRef = { name: string; url: string; path?: string; type?: string }

export const COLUMN_TYPES: { type: ColumnType; label: string; icon: string; color: string }[] = [
  { type: 'status', label: 'Status', icon: '▤', color: '#00C875' },
  { type: 'text', label: 'Text', icon: 'T', color: '#FDAB3D' },
  { type: 'person', label: 'People', icon: '◉', color: '#579BFC' },
  { type: 'date', label: 'Date', icon: '▦', color: '#9D50DD' },
  { type: 'number', label: 'Numbers', icon: '#', color: '#FFCB00' },
  { type: 'file', label: 'Files', icon: '⎘', color: '#FF642E' },
  { type: 'link', label: 'Connect boards', icon: '⇄', color: '#784BD1' },
  { type: 'phone', label: 'Phone', icon: '✆', color: '#00C875' },
  { type: 'email', label: 'Email', icon: '@', color: '#579BFC' },
  { type: 'url', label: 'Link', icon: '↗', color: '#66CCFF' },
  { type: 'checkbox', label: 'Checkbox', icon: '✓', color: '#00C875' },
  { type: 'location', label: 'Location', icon: '⌖', color: '#DF2F4A' },
  { type: 'formula', label: 'Formula', icon: 'ƒ', color: '#225091' },
]

export const PALETTE = [
  '#00C875', '#9CD326', '#CAB641', '#FFCB00', '#FDAB3D', '#FF642E', '#DF2F4A', '#FF5AC4',
  '#FF158A', '#BB3354', '#784BD1', '#9D50DD', '#401694', '#225091', '#0086C0', '#579BFC',
  '#66CCFF', '#A1B4C6', '#6CA6C9', '#7F5347', '#C4C4C4', '#757575', '#D0AE4C', '#8A6B2E',
]

export const GROUP_COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#DF2F4A', '#9D50DD', '#FF5AC4', '#D0AE4C', '#0086C0', '#784BD1', '#66CCFF', '#9CD326', '#FF642E']

// Sangsters brand
export const BRAND = {
  gold: '#D0AE4C',
  goldDark: '#A8862E',
  brown: '#624920',
  ink: '#323338',
  muted: '#676879',
  border: '#D0D4E4',
  rowBorder: '#E6E9EF',
  hover: '#F5F6F8',
  selected: '#FBF4E6',
}

export function labelsOf(col: Column | undefined): Label[] {
  return (col?.settings?.labels ?? []) as Label[]
}

export function labelFor(col: Column | undefined, id: any): Label | undefined {
  if (!col || id == null) return undefined
  return labelsOf(col).find(l => l.id === id)
}

export function newId(prefix = 'l') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

export function currencyOf(col: Column | undefined) {
  return col?.settings?.currency ?? ''
}

export function fmtNumber(n: any, currency = '') {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return ''
  const v = Number(n)
  const s = v.toLocaleString('en-GB', { maximumFractionDigits: Math.abs(v) < 100 && v % 1 ? 2 : 0 })
  return currency ? `${currency}${s}` : s
}

export function fmtDate(d: any) {
  if (!d) return ''
  const dt = new Date(String(d).length === 10 ? d + 'T00:00:00' : d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initials(name: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
}

export function avatarColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[h % 16]
}

export function isImage(f: FileRef) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(f.url || f.name) || (f.type ?? '').startsWith('image/') || f.name === 'Photo'
}

export function formulaValue(col: Column, item: Item): number | null {
  const s = col.settings ?? {}
  const a = Number(item.values?.[s.a])
  const b = Number(item.values?.[s.b])
  if (!s.a || !s.b || Number.isNaN(a) || Number.isNaN(b) || item.values?.[s.a] == null || item.values?.[s.b] == null) return null
  switch (s.op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? null : a / b
    default: return null
  }
}

// Plain text version of a cell, for search, sorting and CSV
export function cellText(col: Column, item: Item, itemsById?: Map<string, Item>): string {
  const v = item.values?.[col.id]
  switch (col.type) {
    case 'status': return labelFor(col, v)?.label ?? ''
    case 'person': return Array.isArray(v) ? v.map((p: Person) => p.name).join(', ') : ''
    case 'date': return v ?? ''
    case 'checkbox': return v ? 'Yes' : ''
    case 'location': return v?.address ?? ''
    case 'file': return Array.isArray(v) ? v.map((f: FileRef) => f.name).join(', ') : ''
    case 'link': return Array.isArray(v) ? v.map((id: string) => itemsById?.get(id)?.name ?? '').filter(Boolean).join(', ') : ''
    case 'formula': { const n = formulaValue(col, item); return n == null ? '' : String(n) }
    default: return v == null ? '' : String(v)
  }
}

export function sortValue(col: Column, item: Item, itemsById?: Map<string, Item>): number | string {
  const v = item.values?.[col.id]
  if (col.type === 'number') return v == null || v === '' ? Number.NEGATIVE_INFINITY : Number(v)
  if (col.type === 'formula') return formulaValue(col, item) ?? Number.NEGATIVE_INFINITY
  if (col.type === 'status') { const idx = labelsOf(col).findIndex(l => l.id === v); return idx < 0 ? 999 : idx }
  return cellText(col, item, itemsById).toLowerCase()
}

export function colByKey(cols: Column[], boardId: string | undefined, key: string) {
  return cols.find(c => c.board_id === boardId && c.key === key)
}

export function singular(label: string) {
  return (label || 'item').toLowerCase()
}
