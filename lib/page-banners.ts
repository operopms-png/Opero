// Pages that do not draw their own blue banner get one from here (components/PageBanner.tsx):
// the page name and one plain line on what it does. Longest matching address wins.
type B = { title: string; text: string }
const PAGES: Record<string, B> = {
  '/property': { title: 'Real Estate Intelligence', text: 'Estate agency, developments, short stays and property management in one place. Each page appears once; search or pick an area. At a glance, below, shows the headline numbers for each area.' },
  '/staff-centre/human-intelligence': { title: 'Human Intelligence Hub', text: 'Every people-run area of the business, grouped under four headings. Open any page from here.' },
  '/property/map': { title: 'Map', text: 'Every property and deal on one street map, coloured by status. Click a pin to see the tenant, rent and what needs doing. Development projects show as In development, with floors, plans and a 3D walk-through to showcase them.' },
  '/staff-centre/platform/revenue': { title: 'Revenue and Customers', text: 'Novourq\'s own monthly income, subscribers, trials and cancellations across every client. Only the platform owner can see this.' },
  '/staff-centre/platform/ai-usage': { title: 'AI Usage and Costs', text: 'What the AI costs per client, so you can protect your margin. Only the platform owner can see this.' },
  '/staff-centre/platform/audit': { title: 'Audit Log', text: 'Every recorded change across every client, newest first. Only the platform owner can see this.' },
  '/staff-centre/platform/notes': { title: 'Notes', text: 'Your private notes in folders, saved automatically. Only the platform owner can see this.' },
  '/staff-centre/oversight': { title: 'Dashboard', text: 'Your whole business at a glance, with Novourq Cloud AI showing what it has done and what is waiting for you.' },
  '/dashboard': { title: 'Dashboard', text: 'Your properties, bookings and jobs at a glance.' },
  '/crm': { title: 'CRM', text: 'Contacts, deals and follow-ups in one place.' },
  '/team': { title: 'Team', text: 'Your team members, their roles and what each person can see.' },
  '/guest-comms': { title: 'Guest Comms', text: 'Messages to and from guests. Novourq Cloud AI drafts replies and you approve them before they send.' },
  '/audit': { title: 'Audit Log', text: 'A record of who changed what and when, for accountability and review.' },
  '/owners': { title: 'Owners', text: 'The property owners you work for, with their contact details, properties and statements.' },
  '/help': { title: 'Help Centre', text: 'Short video walkthroughs of every part of Novourq, and a step-by-step guide. Ask the AI panel if you cannot find what you need.' },
  '/settings': { title: 'Settings', text: 'Your account, team access, branding, connections and billing.' },
  '/integrations': { title: 'Integrations', text: 'Connect your booking sites, calendars, payments and smart devices.' },
  '/turnovers': { title: 'Turnovers', text: 'Changeovers between stays: cleaning, checks and restocking, with who is doing each one.' },
  '/maintenance': { title: 'Maintenance', text: 'Repair jobs across your properties, with priority, who is handling each and progress.' },
  '/properties': { title: 'Properties', text: 'Every property you manage, with address, owner and status. Open one to edit it.' },
  '/staff-dashboard': { title: 'My Dashboard', text: 'Your own tasks, messages and what needs your attention today.' },
  '/cleaning': { title: 'Cleaning', text: 'Cleaning jobs: what is scheduled, who is doing it and when it is done.' },
  '/reports': { title: 'Reports', text: 'Summary reports across your properties, ready to review or export.' },
  '/documents': { title: 'Documents', text: 'Contracts, certificates and other files, filed against the right property or person. Owner and tenant uploads wait here to approve, reject or chase.' },
  '/analytics': { title: 'Analytics', text: 'Occupancy, average rate and revenue trends, so you can see what earns the most.' },
  '/staff-centre/data-hub': { title: 'Data Hub', text: 'Everything stored for your business, how complete it is, where it came from, and what tenants and landlords have asked for.' },
  '/staff-centre/tasks': { title: 'Tasks', text: 'Assign tasks to the team and track them to done. Each person sees their own on their dashboard.' },
  '/staff-centre/meetings': { title: 'Meetings', text: 'Your booking links and scheduled meetings. Share a link and people pick a time that suits you.' },
  '/staff-centre/maintenance': { title: 'Maintenance', text: 'Repair jobs across all properties, with who is handling each one and its progress.' },
  '/staff-centre/applications': { title: 'Applications', text: 'Rental applications received, and where each one is in referencing and approval.' },
  '/staff-centre/hr': { title: 'People & HR', text: 'Your team records in one place: staff details, leave, contracts and reviews.' },
  '/staff-centre/crm': { title: 'CRM', text: 'Contacts, deals and follow-ups for landlords, tenants and buyers.' },
  '/staff-centre/marketing': { title: 'Marketing', text: 'Campaigns, content and leads from your marketing, with results for each.' },
  '/staff-centre/performance': { title: 'Staff Performance', text: 'How each team member is doing: tasks finished, response times and targets.' },
  '/staff-centre/website-chats': { title: 'Website Chats', text: 'Conversations from your website. Novourq Cloud AI answers visitors, books viewings and saves leads.' },
  '/staff-centre/ask-grok': { title: 'Novourq Cloud AI', text: 'Ask Novourq Cloud AI anything about your business. It answers from your own records.' },
  '/staff-centre/activity-log': { title: 'Activity Log', text: 'Who changed what, and when, across properties, people, money and operations. Admins see every change in the company. Everyone else sees their own.' },
  '/staff-centre/inbox': { title: 'Inbox', text: 'Every message from guests, tenants and landlords in one place. Replies are drafted for your approval.' },
  '/staff-centre/email': { title: 'Email', text: 'Email templates and sent messages, with your branding applied.' },
  '/staff-centre/ai-command-centre/snapshot': { title: 'Business snapshot', text: 'A one-page picture of your business and what Novourq Cloud AI is doing for it.' },
  '/staff-centre/ai-command-centre/agent-pool': { title: 'Skills', text: 'Everything Novourq Cloud AI can do for you, and which skills are switched on.' },
  '/staff-centre/ai-command-centre/approvals': { title: 'Approvals', text: 'Anything Novourq Cloud AI has drafted that is waiting for you, plus what it has already sent automatically.' },
  '/staff-centre/ai-command-centre/deal-analyser': { title: 'Deal Analyser', text: 'Work out whether a deal stacks up, or tell the AI what you are looking for in Find Deals and it searches for real listings and learns your taste.' },
}
const MODULE_PAGES: Record<string, B> = {
  reporting: { title: 'Reporting', text: 'Reports on income, expenses and performance, ready to review or export.' },
  crm: { title: 'CRM', text: 'Enquiries, contacts and deals for this part of the business, with follow-ups.' },
  service: { title: 'Service', text: 'Support tickets and requests from tenants, guests and owners, and how each was resolved.' },
  marketing: { title: 'Marketing', text: 'Campaigns, content and lead sources for this part of the business.' },
  vendors: { title: 'Vendors', text: 'Contractors and suppliers you use, with work orders and costs.' },
}
export function bannerFor(path: string): B | null {
  const p = path.replace(/\/+$/, '')
  const keys = Object.keys(PAGES).sort((a, b) => b.length - a.length)
  for (const k of keys) if (p === k || p.startsWith(k + '/')) return PAGES[k]
  const m = p.match(/^\/(pm|estate|str|dev)\/(reporting|crm|service|marketing|vendors)$/)
  return m ? MODULE_PAGES[m[2]] : null
}
