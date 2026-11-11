// Currencies for the Deal Analyser. Figures are entered and calculated in
// the chosen currency; the maths doesn't care which. Rates are only used to
// scale £-based rule thresholds (AI Verdict) and to tell the AI which
// currency to report market data in.
export type Cur = 'GBP' | 'JMD' | 'USD' | 'EUR' | 'AED' | 'CAD'
export const CURRENCIES: Record<Cur, { sym: string; label: string; locale: string }> = {
  GBP: { sym: '£', label: '£ GBP', locale: 'en-GB' },
  JMD: { sym: 'J$', label: 'J$ JMD', locale: 'en-JM' },
  USD: { sym: '$', label: '$ USD', locale: 'en-US' },
  EUR: { sym: '€', label: '€ EUR', locale: 'en-IE' },
  AED: { sym: 'AED ', label: 'AED', locale: 'en-AE' },
  CAD: { sym: 'C$', label: 'C$ CAD', locale: 'en-CA' },
}
export const curOf = (form: any): Cur => (['GBP', 'JMD', 'USD', 'EUR', 'AED', 'CAD'].includes(form?.currency) ? form.currency : 'GBP')
export const symOf = (form: any) => CURRENCIES[curOf(form)].sym

// Rough fallbacks (units per £1) if the live rate can't be fetched
export const FALLBACK_PER_GBP: Record<Cur, number> = { GBP: 1, USD: 1.34, JMD: 210, EUR: 1.17, AED: 4.92, CAD: 1.87 }

// Server only: live units per £1, cached for 12 hours
export async function ratesPerGBP(): Promise<Record<Cur, number>> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/GBP', { next: { revalidate: 43200 } } as any)
    const d = await r.json()
    if (d?.rates?.USD && d?.rates?.JMD) return { GBP: 1, USD: d.rates.USD, JMD: d.rates.JMD, EUR: d.rates.EUR || FALLBACK_PER_GBP.EUR, AED: d.rates.AED || FALLBACK_PER_GBP.AED, CAD: d.rates.CAD || FALLBACK_PER_GBP.CAD }
  } catch {}
  return FALLBACK_PER_GBP
}
