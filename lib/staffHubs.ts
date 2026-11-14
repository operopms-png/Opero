// Staff Centre menu, grouped. Each hub is one link in the sidebar; the pages
// inside it show as tabs along the top of the page (components/HubTabs.tsx).
// A tab keeps the access rules it had as its own menu item: scTab (Staff
// Centre tab permission) or requiresModule. The hub link goes to the first tab
// the person can open, and its red badge is the total of its tabs' badges.

import type { StaffCentreKey, ModuleKey } from './accessRegistry'

export type HubTab = { href: string; label: string; scTab?: StaffCentreKey; requiresModule?: ModuleKey; badge?: string; hidden?: boolean }
export type Hub = { label: string; icon: string; tabs: HubTab[] }

export const STAFF_HUBS: Hub[] = [
  { label: 'Dashboard', icon: 'trendingup', tabs: [
    { href: '/staff-centre/oversight', label: 'Dashboard', scTab: 'oversight' },
  ] },
  { label: 'Data Hub', icon: 'folder', tabs: [{ href: '/staff-centre/data-hub', label: 'Data Hub', scTab: 'datahub' }] },
  { label: 'Company Documents', icon: 'file', tabs: [{ href: '/staff-centre/company-documents', label: 'Company Documents', scTab: 'companydocs' }] },
  { label: 'Novourq Cloud AI', icon: 'sparkles', tabs: [
    { href: '/staff-centre/ai-command-centre', label: 'Novourq Cloud AI', scTab: 'ai', hidden: true },
    { href: '/staff-centre/ai-command-centre/agent-pool', label: 'Agent Pool', scTab: 'ai', hidden: true },
    { href: '/staff-centre/ai-approvals', label: 'AI Approvals', scTab: 'ai', hidden: true },
    { href: '/staff-centre/ai-command-centre/results', label: 'AI Results', scTab: 'ai', hidden: true },
    { href: '/staff-centre/ai-command-centre/ask-grok', label: 'Novourq Cloud AI', scTab: 'ai', hidden: true },
    { href: '/staff-centre/ai-command-centre/deal-analyser', label: 'Deal Analyser', requiresModule: 'invest', hidden: true },
  ] },
  { label: 'Inbox', icon: 'message', tabs: [
    { href: '/staff-centre/inbox', label: 'Conversations', scTab: 'inbox', badge: 'inbox' },
    { href: '/staff-centre/email', label: 'Email', scTab: 'inbox' },
    { href: '/staff-centre/airbnb', label: 'Airbnb Inbox', scTab: 'inbox' },
    { href: '/staff-centre/website-chats', label: 'Website Chats', scTab: 'inbox', badge: 'webchat' },
    { href: '/staff-centre/receptionist', label: 'AI Assistant', scTab: 'inbox' },
  ] },
  { label: 'CRM', icon: 'contacts', tabs: [
    { href: '/staff-centre/crm', label: 'CRM', scTab: 'crm', badge: 'crm' },
    { href: '/staff-centre/landlord-leads', label: 'Landlord Leads', scTab: 'landlordleads' },
  ] },
  { label: 'Client Properties', icon: 'home', tabs: [
    { href: '/staff-centre/client-properties', label: 'Client Properties', scTab: 'clientproperties' },
    { href: '/invest', label: 'Deal Analyser', requiresModule: 'invest' },
    { href: '/invest?section=Watchlist', label: 'Watchlist', requiresModule: 'invest' },
  ] },
  { label: 'Owners & Tenants', icon: 'users', tabs: [
    { href: '/pm?tab=Landlords', label: 'Owners', requiresModule: 'pm' },
    { href: '/pm?tab=Tenants', label: 'Tenants', requiresModule: 'pm' },
    { href: '/staff-centre/tenant-onboarding', label: 'Tenant onboarding', scTab: 'companydocs' },
    { href: '/staff-centre/cohosts', label: 'Co-hosts', scTab: 'companydocs' },
    { href: '/staff-centre/documents', label: 'Documents', scTab: 'companydocs' },
  ] },
  { label: 'Partners & Investors', icon: 'users', tabs: [
    { href: '/staff-centre/partners', label: 'Partners', scTab: 'partners', badge: 'partners' },
    { href: '/staff-centre/investors', label: 'Investors', scTab: 'investors' },
  ] },
  { label: 'Portals', icon: 'globe', tabs: [
    { href: '/staff-centre/portal-access', label: 'Portal Access', scTab: 'portalaccess' },
    { href: '/staff-centre/portals', label: 'Property Portals', scTab: 'portals' },
    { href: '/staff-centre/crew', label: 'Cleaners & Maintenance', scTab: 'portalaccess' },
  ] },
  { label: 'Marketing', icon: 'sparkles', tabs: [
    { href: '/staff-centre/marketing', label: 'Marketing', scTab: 'marketing' },
    { href: '/staff-centre/services-pack', label: 'Services Pack', scTab: 'marketing' },
    { href: '/staff-centre/listings', label: 'Listings', scTab: 'listings', badge: 'listings' },
  ] },
  { label: 'Schedule', icon: 'calendar', tabs: [
    { href: '/staff-centre/calendar', label: 'Calendar', scTab: 'calendar' },
    { href: '/staff-centre/meetings', label: 'Meetings', scTab: 'meetings', badge: 'meetings' },
    { href: '/staff-centre/tasks', label: 'Tasks', scTab: 'tasks', badge: 'tasks' },
  ] },
  { label: 'Finance', icon: 'revenue', tabs: [
    { href: '/staff-centre/finance', label: 'Overview', scTab: 'finance' },
    { href: '/staff-centre/finance/payouts', label: 'Owner Payouts', scTab: 'finance' },
    { href: '/staff-centre/finance/arrears', label: 'Arrears', scTab: 'finance', badge: 'arrears' },
    { href: '/staff-centre/finance/reminders', label: 'Reminders', scTab: 'finance' },
    { href: '/staff-centre/finance/risk-alerts', label: 'Risk alerts', scTab: 'finance' },
    { href: '/staff-centre/finance/partner-payouts', label: 'Partner Payouts', scTab: 'finance' },
    { href: '/staff-centre/invoices', label: 'Invoices', scTab: 'invoices' },
    { href: '/staff-centre/approvals', label: 'Approvals', scTab: 'approvals', badge: 'approvals' },
  ] },
  { label: 'Tax Compliance', icon: 'taxshield', tabs: [{ href: '/staff-centre/tax-compliance', label: 'Tax Compliance', scTab: 'finance' }] },
  { label: 'Reports', icon: 'revenue', tabs: [
    { href: '/pm?tab=Reports', label: 'Portfolio Reports', requiresModule: 'pm' },
    { href: '/pm?tab=Unit%20Profit', label: 'Unit Profit', requiresModule: 'pm' },
    { href: '/pm?tab=Landlord%20Reports', label: 'Landlord Reports', requiresModule: 'pm' },
    { href: '/pm?tab=Accounting%20Export', label: 'Accounting Export', requiresModule: 'pm' },
  ] },
  { label: 'Operations', icon: 'wrench', tabs: [
    { href: '/staff-centre/maintenance', label: 'Maintenance Board', scTab: 'maintenance', badge: 'maintenance' },
    { href: '/staff-centre/compliance', label: 'Compliance', scTab: 'compliance', badge: 'compliance' },
    { href: '/cleaning', label: 'Cleaning', requiresModule: 'str' },
    { href: '/turnovers', label: 'Turnovers', requiresModule: 'str' },
  ] },
  { label: 'Smart Home', icon: 'shield', tabs: [{ href: '/staff-centre/smart-home', label: 'Smart Home', scTab: 'smarthome' }] },
  { label: 'Team', icon: 'team', tabs: [
    { href: '/settings?section=Team+Management', label: 'Team Management' },
    { href: '/staff-centre/announcements', label: 'Announcements', scTab: 'announcements', badge: 'announcements' },
    { href: '/staff-centre/activity-log', label: 'Activity Log', scTab: 'activitylog' },
    { href: '/staff-centre/work-hours', label: 'Work Hours', scTab: 'activitylog' },
    { href: '/staff-centre/hr', label: 'People & HR', scTab: 'hr', badge: 'hr' },
    { href: '/staff-centre/hr-documents', label: 'HR Documents', scTab: 'hr' },
    { href: '/staff-centre/performance', label: 'Staff Performance', scTab: 'performance' },
    { href: '/staff-centre/training', label: 'Staff Training', scTab: 'training' },
    { href: '/staff-centre/applications', label: 'Applications', scTab: 'applications', badge: 'applications' },
  ] },
]

// Hubs that stay on their own in the menu; every other hub sits inside the Human Intelligence Hub.
export const NON_HUMAN_HUBS = ['Dashboard', 'Novourq Cloud AI']

export const HUMAN_HUB_HREF = '/staff-centre/human-intelligence'
// Every tab of every people-run hub, with the hub's own page first, so one sidebar link covers them all.
export function humanHubTabs(): HubTab[] {
  return [{ href: HUMAN_HUB_HREF, label: 'Human Intelligence Hub' }, ...STAFF_HUBS.filter(h => !NON_HUMAN_HUBS.includes(h.label)).flatMap(h => h.tabs)]
}

const ALL_TABS = STAFF_HUBS.flatMap(h => h.tabs)

// Platform Owner section: shown in the sidebar under Settings, only to the platform
// owner's login (lib/platform-owner.ts). Client companies, their admins and teams never see it.
// To add an owner-only page, add a line here.
export const OWNER_TABS: { href: string; label: string; icon: string }[] = [
  { href: '/staff-centre/customer-onboarding', label: 'Customer Onboarding', icon: 'shield' },
  { href: '/staff-centre/platform/revenue', label: 'Revenue and Customers', icon: 'revenue' },
  { href: '/staff-centre/platform/ai-usage', label: 'AI Usage and Costs', icon: 'sparkles' },
  { href: '/staff-centre/platform/audit', label: 'Audit Log', icon: 'file' },
  { href: '/staff-centre/platform/notes', label: 'Notes', icon: 'file' },
]
// Page paths that only the platform owner may open
export const OWNER_ONLY_PATHS = OWNER_TABS.map(t => t.href.split('?')[0])

// Is this tab the page being shown? A tab with ?section=… matches only that
// section; a tab without one matches its path unless another tab claims the
// current section (so /invest?section=Watchlist lights Watchlist, not Deal Analyser).
export function tabMatches(tab: HubTab, pathname: string, search: string) {
  const [p, q] = tab.href.split('?')
  if (pathname !== p && !pathname.startsWith(p + '/')) return false
  const sp = new URLSearchParams(search)
  const KEYS = ['section', 'tab']
  if (q) {
    const want = new URLSearchParams(q)
    const key = KEYS.find(k => want.has(k))
    return key ? sp.get(key) === want.get(key) : true
  }
  // a link with no query matches only when no sibling link on this path claims the current query
  return !ALL_TABS.some(t => {
    const [p2, q2] = t.href.split('?')
    if (p2 !== p || !q2) return false
    const w = new URLSearchParams(q2)
    return KEYS.some(k => w.has(k) && sp.get(k) === w.get(k))
  })
}

export function hubFor(pathname: string, search: string) {
  return STAFF_HUBS.find(h => h.tabs.some(t => tabMatches(t, pathname, search))) || null
}
