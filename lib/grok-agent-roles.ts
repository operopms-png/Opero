// Which Grok role answers for each AI staff member, matched on their job role.
// Shared by the Ask Grok panel and the Agent Pool so both pick the same role.
// Anything not matched uses the general assistant.
export function grokRoleForJob(jobRole: string | null | undefined): string {
  const j = String(jobRole || '').toLowerCase()
  if (j.includes('property manager')) return 'property_manager'
  if (j.includes('finance') || j.includes('tax')) return 'finance_director'
  if (j.includes('acquisition')) return 'acquisitions'
  if (j.includes('executive assistant')) return 'executive_assistant'
  if (j.includes('risk') || j.includes('compliance')) return 'risk_compliance'
  if (j.includes('deal analyst')) return 'deal_analyst'
  if (j.includes('receptionist')) return 'receptionist'
  return 'general'
}
