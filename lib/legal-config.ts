// Fill these in once the Novourq legal entity is confirmed. Empty values are simply left out of the public pages.
export const LEGAL = {
  product: 'Novourq',
  legalName: '',        // e.g. "Novourq Ltd"
  companyNumber: '',
  address: '',
  privacyEmail: '',     // e.g. privacy@thenovourq.com
  icoNumber: '',
  updated: '3 November 2026',
}
export function operatorLine(): string {
  const p = [LEGAL.legalName, LEGAL.companyNumber && `company number ${LEGAL.companyNumber}`, LEGAL.address && `registered at ${LEGAL.address}`].filter(Boolean)
  return p.length ? p.join(', ') : LEGAL.product
}
