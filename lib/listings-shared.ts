// Shared (browser-safe) bits for the lettings listings: currencies and the
// public listing shape. Rent is stored per property with its own currency;
// J$ (JMD) is the default.

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  JMD: { symbol: 'J$', label: 'Jamaican dollar (J$)' },
  USD: { symbol: 'US$', label: 'US dollar (US$)' },
  GBP: { symbol: '£', label: 'British pound (£)' },
  EUR: { symbol: '€', label: 'Euro (€)' },
  CAD: { symbol: 'C$', label: 'Canadian dollar (C$)' },
  AED: { symbol: 'AED ', label: 'UAE dirham (AED)' },
}

export const money = (amount: number | null | undefined, currency = 'JMD') =>
  amount == null ? '' : `${(CURRENCIES[currency] ?? CURRENCIES.JMD).symbol}${Number(amount).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`

export type Listing = {
  id: string; slug: string; name: string; address: string; type: string
  bedrooms: string; bathrooms: string; rent: number | null; currency: string
  status: 'now' | 'soon'; available_from: string | null
  description: string; features: string[]; photos: { url: string; caption: string }[]
}

export const bedLabel = (b: string) => !b ? '' : /studio/i.test(b) ? 'Studio' : `${b} bed`
export const titleCase = (s: string) => s.toLowerCase() === s || s.toUpperCase() === s ? s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(St|Of|And|The)\b/g, w => w === 'St' ? 'St' : w.toLowerCase()).replace(/^./, c => c.toUpperCase()) : s
