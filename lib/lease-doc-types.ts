// The document checklist on each head lease (Real Estate Intelligence → Head Leases → Documents).
export const LEASE_DOC_TYPES: { key: string; label: string; hint: string; expiry?: boolean }[] = [
  { key: 'master_lease', label: 'Master lease agreement', hint: 'Signed copy of the head lease' },
  { key: 'head_lessor', label: 'Head lessor documents', hint: "Landlord's authority to sublet, consent letters" },
  { key: 'landlord_id', label: 'Landlord ID', hint: 'Passport or driving licence', expiry: true },
  { key: 'ownership', label: 'Proof of ownership', hint: 'Title deed or land registry entry' },
  { key: 'electricity', label: 'Change of electricity', hint: 'Supplier letter or account transfer form' },
  { key: 'other', label: 'Other documents', hint: 'Anything else for this lease' },
]
export const LEASE_DOC_KEYS = LEASE_DOC_TYPES.map(t => t.key)
export const LEASE_DOC_BUCKET = 'lease-docs'
