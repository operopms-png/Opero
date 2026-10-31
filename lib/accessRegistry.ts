// Single source of truth for what a team member can be given access to.
// Team Management (app/settings), the Staff Centre menu (lib/staffHubs.ts) and
// the partner grants all read from here. To add a module or Staff Centre tab,
// add it here once: it then appears in Team Management automatically, and the
// menu config will not compile if it uses a key that is not listed.
// No 'use client' and no imports, so server routes can use it too.

export const STAFF_CENTRE_TABS = [
  { k: 'oversight',  l: 'Dashboard' },
  { k: 'partners',   l: 'Partners' },
  { k: 'investors',  l: 'Investors' },
  { k: 'customeronboarding', l: 'Customer Onboarding' },
  { k: 'meetings',    l: 'Meetings' },
  { k: 'listings',    l: 'Listings' },
  { k: 'smarthome',   l: 'Smart Home' },
  { k: 'inbox',       l: 'Conversations' },
  { k: 'portalaccess', l: 'Portal Access' },
  { k: 'portals',     l: 'Property Portals' },
  { k: 'maintenance', l: 'Maintenance Board' },
  { k: 'compliance',  l: 'Compliance' },
  { k: 'finance',     l: 'Finance (money, payouts, arrears)' },
  { k: 'crm',         l: 'CRM' },
  { k: 'marketing',   l: 'Marketing' },
  { k: 'applications', l: 'Applications' },
  { k: 'performance', l: 'Staff Performance' },
  { k: 'hr',          l: 'People & HR' },
  { k: 'training',    l: 'Staff Training' },
  { k: 'calendar',    l: 'Calendar' },
  { k: 'tasks',       l: 'Tasks' },
] as const

export type StaffCentreKey = typeof STAFF_CENTRE_TABS[number]['k']

// Module chips shown in Team Management's "Custom module access".
export const TEAM_MODULES = [
  { k: 'str',    l: 'Vacation Rentals' },
  { k: 'pm',     l: 'Property Operations' },
  { k: 'ea',     l: 'Estate Agency' },
  { k: 'dev',    l: 'Developments' },
  { k: 'sc',     l: 'Staff Centre' },
  { k: 'aipm',   l: 'AI Property Manager' },
  { k: 'invest', l: 'Deal Analyser & Watchlist' },
] as const

export type ModuleKey = typeof TEAM_MODULES[number]['k']
