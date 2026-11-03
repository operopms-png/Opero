// The list of everything the AI agents do, when each runs, and which result key the scheduled
// job reports it under. Shown on AI Command Centre -> Workflows and Overview.
export type Workflow = { agent: string; label: string; module: string; schedule: string; resultKey?: string; live?: boolean }

export const WORKFLOWS: Workflow[] = [
  { agent: 'chief', label: 'Chief of Staff', module: 'Whole business', schedule: 'Daily, 07:30', resultKey: 'chief' },
  { agent: 'guest', label: 'Guest agent', module: 'Vacation rentals', schedule: 'Live, as each guest message arrives', live: true },
  { agent: 'cleaning', label: 'Cleaning coordinator', module: 'Vacation rentals', schedule: 'Daily, 07:30', resultKey: 'cleaning' },
  { agent: 'maintenance', label: 'Maintenance coordinator (also Property management repairs)', module: 'Vacation rentals', schedule: 'Daily, 07:30', resultKey: 'maintenance' },
  { agent: 'revenue', label: 'Revenue manager', module: 'Vacation rentals', schedule: 'Mondays, 07:30', resultKey: 'rates' },
  { agent: 'owner', label: 'Owner relations', module: 'Vacation rentals', schedule: '1st of the month, 07:30', resultKey: 'ownerReports' },
  { agent: 'leads', label: 'Lead qualification', module: 'Vacation rentals', schedule: 'Live, when a lead is submitted', live: true },
  { agent: 'pm_compliance', label: 'Compliance chaser', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'compliance' },
  { agent: 'pm_renewals', label: 'Renewals agent', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'renewals' },
  { agent: 'pm_arrears', label: 'Arrears escalation', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'arrears' },
  { agent: 'rent_match', label: 'Rent matcher', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'rentMatches' },
  { agent: 'doc_reader', label: 'Document reader', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'leaseDocs' },
  { agent: 'pm_deposits', label: 'Deposit protection watch', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'deposits' },
  { agent: 'pm_insurance', label: 'Insurance renewals', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'insurance' },
  { agent: 'pm_inspections', label: 'Inspection scheduler', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'inspections' },
  { agent: 'pm_statements', label: 'Landlord statement reminders', module: 'Property management', schedule: 'Daily from the 2nd to the 10th, 07:30', resultKey: 'statements' },
  { agent: 'maint_followup', label: 'Maintenance follow-up', module: 'Property management', schedule: 'Daily, 07:30', resultKey: 'maintFollowups' },
  { agent: 'maint_predict', label: 'Predictive maintenance', module: 'Property management', schedule: 'Mondays, 07:30', resultKey: 'maintPredictions' },
  { agent: 'weekly_report', label: 'Weekly management report', module: 'Property management', schedule: 'Mondays, 07:30', resultKey: 'weeklyReport' },
  { agent: 'market_forecast', label: 'Market and rent forecast', module: 'Investment & Portfolio', schedule: '1st of the month, 07:30', resultKey: 'marketForecast' },
  { agent: 'portfolio', label: 'Portfolio review', module: 'Investment & Portfolio', schedule: '1st of the month, 07:30', resultKey: 'portfolio' },
  { agent: 'ea_viewings', label: 'Viewings assistant (also books viewings from the website chat)', module: 'Estate agency', schedule: 'Daily, 07:30, and live from the website chat', resultKey: 'viewings' },
  { agent: 'ea_listings', label: 'Listing writer', module: 'Estate agency', schedule: 'Daily, 07:30', resultKey: 'listings' },
  { agent: 'dev_investors', label: 'Investor updates', module: 'Developments', schedule: '1st of the month, 07:30', resultKey: 'investorUpdates' },
]
export const AGENT_COUNT = WORKFLOWS.length
