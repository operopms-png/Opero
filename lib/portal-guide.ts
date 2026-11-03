// The guide Novourq Cloud AI reads in every chat so it can answer any "where do I...?" or "how does it...?" question
// about the platform. Pages and skills are built from the same lists the app itself uses, so the guide stays current.
import { STAFF_HUBS } from './staffHubs'
import { WORKFLOWS } from './ai-workflows'
import { TAB_DESCRIPTIONS } from './tab-descriptions'

const HOW_TO = `
HOW THINGS WORK (answer from this; give the exact click path)
- Menu: the left menu is the NOVOURQ Ecosystem. It holds Dashboard, Real Estate Intelligence, Novourq Cloud AI, then the Human Intelligence Hub. Settings is at the bottom.
- Real Estate Intelligence is one place for property management, estate agency, short stays (vacation rentals) and developments. Open it, search any page or pick an area, and use "← Real Estate Intelligence" to go back. Every tab has a blue banner saying what it does.
- Human Intelligence Hub lists every people-run area (inbox, CRM, finance, reports, operations, team) grouped under headings, with a search box.
- Editing: records on every page have an Edit button (leases, units, maintenance, expenses and so on). Summary pages (Deadlines, Finance overview, Audit Log) are read-only.
- Novourq Cloud AI is the one AI that runs the platform. It has skills (not separate staff). Each skill watches a part of the business, writes the message or task, and sends or hands it over. See Novourq Cloud AI → Skills, Workflows, Approvals and Results.
- What the AI does without asking: sends emails, replies, instructions, price changes, listings, rent matching and imports. At most 40 automatic actions a day per business. Each skill has a "Send automatically" tick box on its page in Skills; untick it to approve that skill's messages yourself.
- What always needs a person for now: anything that sends money, and legal contracts (lease changes, renewal offers, signing). Those wait in Approvals (Novourq Cloud AI → Approvals). The AI cannot send money.
- Run now: Novourq Cloud AI → Workflows → "Run all now" runs every switched-on skill immediately. Otherwise they run daily at 07:30 UTC (some weekly on Mondays or monthly on the 1st).
- Rent reminders: sent by email and to the tenant's portal (never texts). Windows: 7 to 4 days before, 3 to 1 days before, due day, 1 to 2 days late, 3 to 6 late, 7 to 13 late, 14 to 20 late, 21 or more late. One message per window per rent; skipped if the rent is paid. See Human Intelligence Hub → Finance → Reminders. Arrears list: Human Intelligence Hub → Finance → Arrears, or Real Estate Intelligence → Property Management → Rent.
- Email branding: every AI email uses the company's own logo, name and contact footer, and replies go to their reply-to address. Set these in Human Intelligence Hub → Finance → Invoices → "Invoice settings" (admin only): company name, logo upload, contact lines (address, phone, email, one per line), reply-to. Without them the email shows just the company name.
- Website chat: Novourq Cloud AI answers website visitors, saves leads and books viewings (Human Intelligence Hub → Inbox → Website Chats). A booked viewing is confirmed by email.
- Tenants and landlords have their own portals; reminders and replies appear in the tenant portal chat.
- Setup the platform needs from the account owner: ANTHROPIC_API_KEY (AI), CRON_SECRET (scheduled runs), RESEND_API_KEY (email) in Netlify. If an email or AI feature does nothing, that is the first thing to check.
- Training and staff: Human Intelligence Hub → Team (People & HR, Staff Performance, Staff Training, Applications, Announcements).
`

export function portalGuide(): string {
  const hubs = STAFF_HUBS.map(h => `- ${h.label}: ${h.tabs.filter(t => !t.hidden).map(t => t.label).join(', ') || '(single page)'}`).join('\n')
  const tabs = Object.entries(TAB_DESCRIPTIONS).map(([k, v]) => `- ${k.includes(':') ? k.replace(':', ' ') : k}: ${v}`).join('\n')
  const skills = WORKFLOWS.map(w => `- ${w.label} (${w.module}; ${w.schedule})`).join('\n')
  return `PORTAL GUIDE\n${HOW_TO}\nHUMAN INTELLIGENCE HUB AND OTHER MENU ITEMS (menu item: pages)\n${hubs}\n\nREAL ESTATE INTELLIGENCE TABS (what each does; "dev", "str" prefixes mean the developments and short-stay versions)\n${tabs}\n\nNOVOURQ CLOUD AI SKILLS (${WORKFLOWS.length})\n${skills}\n`
}
