// Monthly repayment schedule for a partner who funded a property. Pure, shared by the page and the API.
export type Plan = { invested: number; start: string; mode: 'fixed' | 'pct'; monthly?: number; pct?: number; net?: number }
export type Row = { due_on: string; amount: number }

export const addMonths = (iso: string, k: number) => {
  const d = new Date(iso + 'T00:00:00Z'), day = Math.min(d.getUTCDate(), 28)
  const m = d.getUTCMonth() + k, y = d.getUTCFullYear() + Math.floor(m / 12)
  return `${y}-${String((((m % 12) + 12) % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function buildSchedule(p: Plan): Row[] {
  const pay = p.mode === 'fixed' ? Number(p.monthly) : (Number(p.net) * Number(p.pct)) / 100
  if (!(p.invested > 0) || !(pay > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(p.start)) return []
  const rows: Row[] = []
  let left = p.invested
  for (let i = 0; i < 240 && left > 0.5; i++) {
    const a = Math.min(pay, left)
    rows.push({ due_on: addMonths(p.start, i), amount: Math.round(a * 100) / 100 })
    left -= a
  }
  return rows
}

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  JMD: { symbol: 'J$', label: 'J$ Jamaican dollar' }, GBP: { symbol: '£', label: '£ Pound sterling' }, USD: { symbol: 'US$', label: 'US$ US dollar' },
  EUR: { symbol: '€', label: '€ Euro' }, CAD: { symbol: 'CA$', label: 'CA$ Canadian dollar' }, AED: { symbol: 'AED ', label: 'AED Emirati dirham' },
}
export const SYMBOL: Record<string, string> = Object.fromEntries(Object.entries(CURRENCIES).map(([k, v]) => [k, v.symbol]))
export const money = (n: number, cur?: string | null) => `${SYMBOL[cur ?? 'JMD'] ?? 'J$'}${Math.round(n).toLocaleString('en-GB')}`
