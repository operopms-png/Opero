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
  videos: { url: string; title: string }[]
}

export const bedLabel = (b: string) => !b ? '' : /studio/i.test(b) ? 'Studio' : `${b} bed`
export const titleCase = (s: string) => s.toLowerCase() === s || s.toUpperCase() === s ? s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(St|Of|And|The)\b/g, w => w === 'St' ? 'St' : w.toLowerCase()).replace(/^./, c => c.toUpperCase()) : s

// Virtual viewing videos are stored as a JSON array of {url,title}.
export function parseVideos(val: string | null | undefined): { url: string; title: string }[] {
  if (!val) return []
  try { const p = JSON.parse(val); if (Array.isArray(p)) return p.filter((v: any) => v && typeof v.url === 'string' && v.url.startsWith('http')).map((v: any) => ({ url: v.url, title: String(v.title || '') })) } catch {}
  return []
}
export function videoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null
}
