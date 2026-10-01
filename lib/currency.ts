// Currencies for the Deal Analyser. Figures are entered and calculated in
// the chosen currency; the maths doesn't care which. Rates are only used to
// scale £-based rule thresholds (AI Verdict) and to tell the AI which
// currency to report market data in.
export type Cur = 'GBP' | 'JMD' | 'USD'
export const CURRENCIES: Record<Cur, { sym: string; label: string; locale: string }> = {
  GBP: { sym: '£', label: '£ GBP', locale: 'en-GB' },
  JMD: { sym: 'J$', label: 'J$ JMD', locale: 'en-JM' },
  USD: { sym: '$', label: '$ USD', locale: 'en-US' },
}
export const curOf = (form: any): Cur => (['GBP', 'JMD', 'USD'].includes(form?.currency) ? form.currency : 'GBP')
export const symOf = (form: any) => CURRENCIES[curOf(form)].sym

// Rough fallbacks (units per £1) if the live rate can't be fetched
export const FALLBACK_PER_GBP: Record<Cur, number> = { GBP: 1, USD: 1.34, JMD: 210 }

// Server only: live units per £1, cached for 12 hours
export async function ratesPerGBP(): Promise<Record<Cur, number>> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/GBP', { next: { revalidate: 43200 } } as any)
    const d = await r.json()
    if (d?.rates?.USD && d?.rates?.JMD) return { GBP: 1, USD: d.rates.USD, JMD: d.rates.JMD }
  } catch {}
  return FALLBACK_PER_GBP
}
