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

// Document checklists by what they belong to. The 'other' type is never counted as one of the key documents.
export type DocSubject = 'head_lease' | 'landlord' | 'tenant'
export const DOC_SETS: Record<DocSubject, typeof LEASE_DOC_TYPES> = {
  head_lease: LEASE_DOC_TYPES,
  landlord: [
    { key: 'landlord_id', label: 'Landlord ID', hint: 'Passport or driving licence', expiry: true },
    { key: 'ownership', label: 'Proof of ownership', hint: 'Title deed or land registry entry' },
    { key: 'mgmt_agreement', label: 'Management agreement', hint: 'Signed agreement between you and the owner' },
    { key: 'address', label: 'Proof of address', hint: 'Utility bill or bank statement, under 3 months old' },
    { key: 'bank', label: 'Bank details', hint: 'Letter or statement for rent payouts' },
    { key: 'other', label: 'Other documents', hint: 'Anything else for this owner' },
  ],
  tenant: [
    { key: 'tenancy', label: 'Tenancy agreement', hint: 'Signed copy of the tenancy' },
    { key: 'tenant_id', label: 'Tenant ID', hint: 'Passport or driving licence', expiry: true },
    { key: 'right_to_rent', label: 'Right to rent', hint: 'Share code check or visa, with its expiry date', expiry: true },
    { key: 'income', label: 'Proof of income', hint: 'Payslips, contract or bank statements' },
    { key: 'references', label: 'References', hint: 'Employer and previous landlord references' },
    { key: 'other', label: 'Other documents', hint: 'Anything else for this tenant' },
  ],
}
export const DOC_SUBJECT_TABLE: Record<DocSubject, string> = { head_lease: 'pm_head_leases', landlord: 'pm_landlords', tenant: 'pm_tenants' }
export const isSubject = (x: string): x is DocSubject => x === 'head_lease' || x === 'landlord' || x === 'tenant'
