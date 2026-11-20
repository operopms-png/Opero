// Each kind of document or email shows its own department's address in the footer, and replies go there.
// NOVOURQ has its own defaults below; every other company sets its own addresses in Invoice settings → Documents
// (a department it leaves blank just keeps the company's normal contact details).
export type Dept = 'career' | 'leasing' | 'clientrelations' | 'hello' | 'finance' | 'billing' | 'legal' | 'admin' | 'contact' | 'upkeep'

export const DEPTS: { key: Dept; label: string; use: string }[] = [
  { key: 'career', label: 'Staff recruitment & onboarding', use: 'Offer letters, employment contracts, new employee onboarding' },
  { key: 'leasing', label: 'Tenant relations & onboarding', use: 'Tenancy agreements, signing invitations, move-in documents' },
  { key: 'clientrelations', label: 'Client relations & onboarding', use: 'Landlord and owner onboarding, management and co-host agreements' },
  { key: 'hello', label: 'Marketing & communications', use: 'Campaigns, newsletters, announcements' },
  { key: 'finance', label: 'Finance & Accounts', use: 'Payslips, payroll, accounting and financial reports' },
  { key: 'billing', label: 'Billing & Payments', use: 'Invoices, payment requests, statements, confirmations' },
  { key: 'legal', label: 'Legal & Compliance', use: 'Legal notices, compliance and regulatory documents' },
  { key: 'admin', label: 'Administration', use: 'General admin and anything not listed above' },
  { key: 'contact', label: 'General enquiries', use: 'Public enquiries and first contact' },
  { key: 'upkeep', label: 'Upkeep', use: 'Property maintenance, repairs, preventative maintenance, cleaning services, housekeeping, cleaning schedules and property upkeep' },
]

const NOVOURQ_DEFAULTS: Record<Dept, string> = {
  career: 'career@thenovourq.com', leasing: 'leasing@thenovourq.com', clientrelations: 'clientrelations@thenovourq.com',
  hello: 'hello@thenovourq.com', finance: 'finance@thenovourq.com', billing: 'billing@thenovourq.com',
  legal: 'legal@thenovourq.com', admin: 'admin@thenovourq.com', contact: 'contact.us@thenovourq.com', upkeep: 'upkeep@thenovourq.com',
}

type S = { company_name?: string | null; dept_emails?: string | null; offer_letter_email?: string | null }
const ok = (e: any) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim())

/** The address for each department: the company's own setting first, then NOVOURQ's defaults for NOVOURQ only. */
export function deptEmails(s: S): Partial<Record<Dept, string>> {
  let own: any = {}
  try { own = JSON.parse(String(s.dept_emails || '{}')) || {} } catch { own = {} }
  const nov = (s.company_name || '').trim().toUpperCase() === 'NOVOURQ'
  const out: Partial<Record<Dept, string>> = {}
  for (const d of DEPTS) {
    const v = String(own[d.key] || '').trim() || (d.key === 'career' ? String(s.offer_letter_email || '').trim() : '') || (nov ? NOVOURQ_DEFAULTS[d.key] : '')
    if (ok(v)) out[d.key] = v
  }
  return out
}

/** Which department a document belongs to, from its title. */
export function deptFor(title?: string | null): Dept {
  const t = String(title || '').trim()
  if (/payslip|payroll/i.test(t)) return 'finance'
  if (/^offer letter|employment|staff notice|work hours/i.test(t)) return 'career'
  if (/master lease|landlord|co-?host|shortlet|estate agency|management agreement|corporate (residential|accommodation)|owner/i.test(t)) return 'clientrelations'
  if (/tenan|move-in|deposit|occupan|right to rent|lease/i.test(t)) return 'leasing'
  if (/maintenance|repair|cleaning|housekeeping|upkeep|turnover/i.test(t)) return 'upkeep'
  if (/invoice|payment|statement/i.test(t)) return 'billing'
  if (/legal|compliance|notice|nda|confidential/i.test(t)) return 'legal'
  return 'admin'
}

/** Puts the department address in the contact lines (replacing the first email there) and returns it as the reply-to. */
export function withDept(contact_lines: string | null, reply_to: string | null, email?: string) {
  if (!email) return { contact_lines, reply_to }
  const lines = String(contact_lines || '').split('\n').map(l => l.trim()).filter(Boolean)
  const i = lines.findIndex(l => /^[^@\s]+@[^@\s]+$/.test(l))
  if (i >= 0) lines[i] = email; else lines.splice(1, 0, email)
  return { contact_lines: lines.join('\n'), reply_to: email }
}
