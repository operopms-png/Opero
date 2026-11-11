// The company's bank accounts, edited in one place (Staff Centre → Documents → Bank accounts) and used to fill
// {deposit_bank_details} and {payment_bank_details} in documents, so a bank change updates every new document.
export const BANK_PURPOSES: Record<string, string> = { deposit: 'Deposits (client account)', rent: 'Rent and other payments' }
export type BankAccount = { id: string; purpose: string; currency: string; label: string | null; bank_name: string | null; account_name: string | null; account_number: string | null; branch_or_sort_code: string | null; iban: string | null; swift: string | null; reference_note: string | null; active: boolean; sort_order: number }
export function bankLine(a: Partial<BankAccount>) {
  const bits = [a.bank_name, a.account_name && `Account name: ${a.account_name}`, a.account_number && `Account number: ${a.account_number}`, a.branch_or_sort_code && `Branch / sort code: ${a.branch_or_sort_code}`, a.iban && `IBAN: ${a.iban}`, a.swift && `SWIFT: ${a.swift}`, a.reference_note && `Reference: ${a.reference_note}`]
  return `${a.currency ? a.currency + ': ' : ''}${bits.filter(Boolean).join(' · ')}`
}
