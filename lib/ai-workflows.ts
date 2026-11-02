// The list of everything the AI agents do, when each runs, and which result key the scheduled
// job reports it under. Shown on AI Command Centre -> Workflows and Overview.
export type Workflow = { agent: string; label: string; module: string; schedule: string; resultKey?: string; live?: boolean }

export const WORKFLOWS: Workflow[] = [
  { agent: 'guest', label: 'Guest agent', module: 'Vacation rentals', schedule: 'Live, as each guest message arrives', live: true },
  { agent: 'cleaning', label: 'Cleaning coordinator', module: 'Vacation rentals', schedule: 'Daily, 07:30', resultKey: 'cleaning' },
  { agent: 'maintenance', label: 'Maintenance coordinator', module: 'Vacation rentals', schedule: 'Daily, 07:30', resultKey: 'maintenance' },
  { agent: 'revenue', label: 'Revenue manager', module: 'Vacation rentals', schedule: 'Mondays, 07:30', resultKey: 'rates' },
  { agent: 'owner', label: 'Owner relations', module: 'Vacation rentals', schedule: '1st of the month, 07:30', resultKey: 'ownerReports' },
  { agent: 'leads', label: 'Lead qualification', module: 'Vacation rentals', schedule: 'Live, when a lead is submitted', live: true },
  { agent: 'pm_compliance', label: 'Compliance chaser', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'compliance' },
  { agent: 'pm_renewals', label: 'Renewals agent', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'renewals' },
  { agent: 'pm_arrears', label: 'Arrears escalation', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'arrears' },
  { agent: 'rent_match', label: 'Rent matcher', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'rentMatches' },
  { agent: 'ea_viewings', label: 'Viewings assistant', module: 'Estate agency', schedule: 'Daily, 07:30', resultKey: 'viewings' },
  { agent: 'ea_listings', label: 'Listing writer', module: 'Estate agency', schedule: 'Daily, 07:30', resultKey: 'listings' },
  { agent: 'dev_investors', label: 'Investor updates', module: 'Developments', schedule: '1st of the month, 07:30', resultKey: 'investorUpdates' },
]
export const AGENT_COUNT = WORKFLOWS.length
