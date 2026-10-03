// Staff Centre menu, grouped. Each hub is one link in the sidebar; the pages
// inside it show as tabs along the top of the page (components/HubTabs.tsx).
// A tab keeps the access rules it had as its own menu item: scTab (Staff
// Centre tab permission) or requiresModule. The hub link goes to the first tab
// the person can open, and its red badge is the total of its tabs' badges.

export type HubTab = { href: string; label: string; scTab?: string; requiresModule?: string; badge?: string }
export type Hub = { label: string; icon: string; tabs: HubTab[] }

export const STAFF_HUBS: Hub[] = [
  { label: 'Dashboard', icon: 'trendingup', tabs: [{ href: '/staff-centre/oversight', label: 'Dashboard', scTab: 'oversight' }] },
  { label: 'Inbox', icon: 'message', tabs: [
    { href: '/staff-centre/inbox', label: 'Conversations', scTab: 'inbox', badge: 'inbox' },
    { href: '/staff-centre/email', label: 'Email', scTab: 'inbox' },
    { href: '/staff-centre/airbnb', label: 'Airbnb Inbox', scTab: 'inbox' },
    { href: '/staff-centre/website-chats', label: 'Website Chats', scTab: 'inbox', badge: 'webchat' },
    { href: '/staff-centre/receptionist', label: 'AI Assistant', scTab: 'inbox' },
  ] },
  { label: 'CRM', icon: 'contacts', tabs: [
    { href: '/staff-centre/crm', label: 'CRM', scTab: 'crm', badge: 'crm' },
    { href: '/staff-centre/landlord-leads', label: 'Landlord Leads', scTab: 'crm' },
  ] },
  { label: 'Client Properties', icon: 'home', tabs: [
    { href: '/staff-centre/client-properties', label: 'Client Properties', scTab: 'crm' },
    { href: '/invest', label: 'Deal Analyser', requiresModule: 'invest' },
    { href: '/invest?section=Watchlist', label: 'Watchlist', requiresModule: 'invest' },
  ] },
  { label: 'Partners & Investors', icon: 'users', tabs: [
    { href: '/staff-centre/partners', label: 'Partners', scTab: 'partners', badge: 'partners' },
    { href: '/staff-centre/investors', label: 'Investors', scTab: 'investors' },
  ] },
  { label: 'Portals', icon: 'globe', tabs: [
    { href: '/staff-centre/portal-access', label: 'Portal Access', scTab: 'portalaccess' },
    { href: '/staff-centre/portals', label: 'Property Portals', scTab: 'portals' },
    { href: '/staff-centre/customer-onboarding', label: 'Customer Onboarding', scTab: 'customeronboarding' },
  ] },
  { label: 'Marketing', icon: 'sparkles', tabs: [
    { href: '/staff-centre/marketing', label: 'Marketing', scTab: 'marketing' },
    { href: '/staff-centre/listings', label: 'Listings', scTab: 'listings', badge: 'listings' },
  ] },
  { label: 'Schedule', icon: 'calendar', tabs: [
    { href: '/staff-centre/calendar', label: 'Calendar', scTab: 'calendar' },
    { href: '/staff-centre/meetings', label: 'Meetings', scTab: 'meetings', badge: 'meetings' },
    { href: '/staff-centre/tasks', label: 'Tasks', scTab: 'tasks', badge: 'tasks' },
  ] },
  { label: 'Maintenance', icon: 'wrench', tabs: [{ href: '/staff-centre/maintenance', label: 'Maintenance Board', scTab: 'maintenance', badge: 'maintenance' }] },
  { label: 'Smart Home', icon: 'shield', tabs: [{ href: '/staff-centre/smart-home', label: 'Smart Home', scTab: 'smarthome' }] },
  { label: 'Team', icon: 'team', tabs: [
    { href: '/settings?section=Team+Management', label: 'Team Management' },
    { href: '/staff-centre/hr', label: 'People & HR', scTab: 'hr', badge: 'hr' },
    { href: '/staff-centre/performance', label: 'Staff Performance', scTab: 'performance' },
    { href: '/staff-centre/training', label: 'Staff Training', scTab: 'training' },
    { href: '/staff-centre/applications', label: 'Applications', scTab: 'applications', badge: 'applications' },
  ] },
]

const ALL_TABS = STAFF_HUBS.flatMap(h => h.tabs)

// Is this tab the page being shown? A tab with ?section=… matches only that
// section; a tab without one matches its path unless another tab claims the
// current section (so /invest?section=Watchlist lights Watchlist, not Deal Analyser).
export function tabMatches(tab: HubTab, pathname: string, search: string) {
  const [p, q] = tab.href.split('?')
  if (pathname !== p && !pathname.startsWith(p + '/')) return false
  const cur = new URLSearchParams(search).get('section')
  if (q) return new URLSearchParams(q).get('section') === cur
  return !ALL_TABS.some(t => { const [p2, q2] = t.href.split('?'); return p2 === p && q2 && new URLSearchParams(q2).get('section') === cur })
}

export function hubFor(pathname: string, search: string) {
  return STAFF_HUBS.find(h => h.tabs.some(t => tabMatches(t, pathname, search))) || null
}
