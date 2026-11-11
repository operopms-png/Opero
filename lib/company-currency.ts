// The company's own currency symbol for money shown across Real Estate Intelligence (set in Settings → Currency).
// Amounts are shown as entered, so this only changes the symbol. Defaults to the pound.
export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'GBP', symbol: '£', label: 'Pound sterling (£)' },
  { code: 'USD', symbol: '$', label: 'US dollar ($)' },
  { code: 'JMD', symbol: 'J$', label: 'Jamaican dollar (J$)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'AED', symbol: 'AED ', label: 'UAE dirham (AED)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian dollar (C$)' },
]
const KEY = 'company-currency-symbol'
let sym = '£'
if (typeof window !== 'undefined') { try { sym = localStorage.getItem(KEY) || '£' } catch { /* default */ } }
export const cur = () => sym
export function setCur(s: string) { sym = s; try { localStorage.setItem(KEY, s) } catch { /* not kept */ } }
