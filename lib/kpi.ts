// KPI Tracker: shared types, starter KPIs and the green / amber / red rule.
export type Unit = 'number' | 'percent' | 'money' | 'days'
export type Dir = 'higher' | 'lower'
export type Kpi = {
  id: string; name: string; unit: Unit; target: number | null; direction: Dir; source: string; sort_order: number
  value: number | null; prev: number | null; auto: boolean; history: { period: string; value: number | null }[]; status: 'good' | 'watch' | 'bad' | 'none'
}

// Starter KPIs. `source` other than 'manual' means the number is worked out from portal data.
export const STARTERS: { name: string; unit: Unit; target: number; direction: Dir; source: string }[] = [
  { name: 'New enquiries', unit: 'number', target: 40, direction: 'higher', source: 'auto:enquiries' },
  { name: 'Viewings booked', unit: 'number', target: 20, direction: 'higher', source: 'auto:viewings' },
  { name: 'Deals won', unit: 'number', target: 5, direction: 'higher', source: 'auto:deals_won' },
  { name: 'Rent collected on time', unit: 'percent', target: 95, direction: 'higher', source: 'auto:rent_collected' },
  { name: 'Repairs fixed', unit: 'number', target: 10, direction: 'higher', source: 'auto:repairs_fixed' },
  { name: 'Homes secured', unit: 'number', target: 3, direction: 'higher', source: 'manual' },
  { name: 'Occupancy', unit: 'percent', target: 90, direction: 'higher', source: 'manual' },
  { name: 'Monthly revenue', unit: 'money', target: 50000, direction: 'higher', source: 'manual' },
  { name: 'Margin kept', unit: 'percent', target: 25, direction: 'higher', source: 'manual' },
]

export const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
export const addMonths = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 10) }

// Green: on or past target. Amber: within 15% of it. Red: further off. Lower-is-better KPIs flip.
export function statusOf(value: number | null, target: number | null, dir: Dir): Kpi['status'] {
  if (value == null || target == null || target === 0) return 'none'
  const r = dir === 'higher' ? value / target : target / (value || 0.0001)
  return r >= 1 ? 'good' : r >= 0.85 ? 'watch' : 'bad'
}

export function fmt(v: number | null | undefined, unit: Unit): string {
  if (v == null || !Number.isFinite(Number(v))) return '—'
  const n = Number(v)
  if (unit === 'percent') return Math.round(n * 10) / 10 + '%'
  if (unit === 'money') return '£' + Math.round(n).toLocaleString('en-GB')
  if (unit === 'days') return Math.round(n * 10) / 10 + ' days'
  return Math.round(n * 10) / 10 + ''
}
