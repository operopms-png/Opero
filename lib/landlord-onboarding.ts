// Landlord onboarding: the agreement types we offer, and the checklist every landlord goes through.
export const AGREEMENT_TYPES: Record<string, { label: string; hint: string }> = {
  standard: { label: 'Standard management', hint: 'We manage the property for a management fee.' },
  guaranteed: { label: 'Guaranteed rent', hint: 'We pay the landlord a fixed rent every month, whether or not the property is let.' },
  partnership: { label: 'Partnership', hint: 'We run the property together and share the income by an agreed split.' },
}
export type Step = { key: string; label: string; done: boolean; hint: string }
