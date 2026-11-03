// Pages that do not draw their own blue banner get one from here (components/PageBanner.tsx):
// the page name and one plain line on what it does. Longest matching address wins.
type B = { title: string; text: string }
const PAGES: Record<string, B> = {
  '/staff-centre/tasks': { title: 'Tasks', text: 'Assign tasks to the team and track them to done. Each person sees their own on their dashboard.' },
  '/staff-centre/meetings': { title: 'Meetings', text: 'Your booking links and scheduled meetings. Share a link and people pick a time that suits you.' },
  '/staff-centre/maintenance': { title: 'Maintenance', text: 'Repair jobs across all properties, with who is handling each one and its progress.' },
  '/staff-centre/applications': { title: 'Applications', text: 'Rental applications received, and where each one is in referencing and approval.' },
  '/staff-centre/hr': { title: 'People & HR', text: 'Your team records in one place: staff details, leave, contracts and reviews.' },
  '/staff-centre/crm': { title: 'CRM', text: 'Contacts, deals and follow-ups for landlords, tenants and buyers.' },
  '/staff-centre/marketing': { title: 'Marketing', text: 'Campaigns, content and leads from your marketing, with results for each.' },
  '/staff-centre/performance': { title: 'Staff Performance', text: 'How each team member is doing: tasks finished, response times and targets.' },
  '/staff-centre/website-chats': { title: 'Website Chats', text: 'Conversations from your website. Novourq Cloud AI answers visitors, books viewings and saves leads.' },
  '/staff-centre/partners': { title: 'Partners', text: 'Investors and agents who work with you, their agreements, payouts and commission.' },
  '/staff-centre/ask-grok': { title: 'Novourq Cloud AI', text: 'Ask Novourq Cloud AI anything about your business. It answers from your own records.' },
  '/staff-centre/inbox': { title: 'Inbox', text: 'Every message from guests, tenants and landlords in one place. Replies are drafted for your approval.' },
  '/staff-centre/email': { title: 'Email', text: 'Email templates and sent messages, with your branding applied.' },
  '/staff-centre/ai-command-centre/snapshot': { title: 'Business snapshot', text: 'A one-page picture of your business and what Novourq Cloud AI is doing for it.' },
  '/staff-centre/ai-command-centre/agent-pool': { title: 'Skills', text: 'Everything Novourq Cloud AI can do for you, and which skills are switched on.' },
  '/staff-centre/ai-command-centre/approvals': { title: 'Approvals', text: 'Everything Novourq Cloud AI has drafted and is waiting for you to approve or reject.' },
  '/staff-centre/ai-command-centre/deal-analyser': { title: 'Deal Analyser', text: 'Work out whether a deal stacks up: costs, rent, yield and profit for each strategy.' },
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
