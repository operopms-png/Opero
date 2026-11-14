// Portal guides shown in Staff Training. The list builds itself from the menu (lib/staffHubs.ts)
// and the Real Estate Intelligence tab lines (lib/tab-descriptions.ts), so a new tab appears
// here automatically with a basic guide. To give a tab a full guide, add its steps to STEPS
// below (key is the tab's address or "re:<module>:<name>"). Keep these in step with the product.
import { STAFF_HUBS, NON_HUMAN_HUBS } from './staffHubs'
import { TAB_DESCRIPTIONS } from './tab-descriptions'
import { bannerFor } from './page-banners'

export type Guide = { key: string; area: string; group: string; title: string; text: string; steps: string[]; full: boolean }

const MODULES: Record<string, string> = { pm: 'Property Management', estate: 'Estate Agency', str: 'Short Stays', dev: 'Developments' }
const HUB = 'Human Intelligence Hub'
const RE = 'Real Estate Intelligence'

export const STEPS: Record<string, string[]> = {
  '/staff-centre/human-intelligence': ['Open Human Intelligence Hub.', 'Find the job in Where do I go?, such as Reply to a customer, Chase rent, Pay an owner or Log a repair.', 'Press the button under it. Where a job has more than one page, press the one you need.', 'To browse instead, pick a heading on the left or type a page name in the search box.', 'Scroll to At a glance at the bottom to see what needs you today. Press a tile to open that page.'],
  '/staff-centre/landlord-leads': ['Open Landlord Leads and press Link & embed code.', 'Copy your own checker link for ads and letters, or the embed code for your website.', 'New landlords appear here and in your CRM. Move each one along as you contact them and book a valuation.'],
  '/staff-centre/receptionist': ['Open Human Intelligence Hub, then AI Assistant.', 'Knowledge & hours: set the receptionist name, your company name, the email for alerts, your time zone and opening hours, and write what it should know about your services, areas, fees and viewings. It only states what you write here.', 'Channels: switch on email (per mailbox), tenant and landlord messages and website chat, and choose when each is answered: always, or only out of hours.', 'Try it: chat with it as a customer would before you switch a channel on.', 'Activity: see everything it handled. Open an item marked Need follow-up, deal with it and tick it resolved.'],
  '/staff-centre/meetings': ['Open Schedule, then Meetings.', 'Copy the Client booking link at the top. It is your own company\'s link, so share it by email, website or WhatsApp.', 'Requests appear under New request. Open one, contact the person and move it along as you book a time.', 'You get a bell notification and an email for each request, and the person is added to your CRM.'],
  '/staff-centre/tax-compliance': ['Open Tax Compliance (admins only) and choose your company\'s tab.', 'Press Edit details to set the company name, currency, registration status, company number and tax note.', 'Add bank accounts, and record transfers between companies if you have more than one.', 'Nothing is filed or paid from here. It keeps your obligations and an audit trail.'],
  're:str:Bookings': ['Open Real Estate Intelligence, choose Short Stays, then the Bookings tab.', 'Use the search box or the date filter to find a stay.', 'Press a booking to see the guest, dates and payments.', 'Press Message to write to the guest. Novourq Cloud AI drafts the reply and you approve it before it sends.'],
  're:str:Guest Check-ins': ['Open Guest Check-ins and find the booking.', 'Press Send to email the check-in link, or Remind if they have not finished.', 'When it is complete, check the ID photo and signed terms.', 'Press Charge damage or Release deposit after the stay.'],
  're:Head Leases': ['Open Head Leases and press a lease.', 'Press Documents to store the master lease and landlord ID.', 'Check the expiry and break dates in the list.'],
  '/staff-centre/hr-documents': ['Open Human Intelligence Hub, then Team, then HR Documents.', 'Press Add NOVOURQ templates to bring in the fillable payslip, or Add document to upload your own.', 'Press Open / fill in, complete the form and save it as a PDF.', 'Press Edit, choose the finished PDF under Replace the file, and save.', 'Press Send, enter the person\'s email, check the subject and message, and press Send email.'],
  '/staff-centre/services-pack': ['Open Marketing, then Services Pack.', 'Press the Landlord, Co-host or Tenant tab to see that audience\'s documents with the right ones ticked. Change the ticks if you need to. Press Add document to upload another PDF.', 'Give the link a name and press Create link. It is copied for you.', 'Paste it into your email, or press Copy message for the ready-made wording with the link under it.', 'Come back to see opens and views per document. Press Pause to turn a link off.'],
  '/staff-centre/inbox': ['Open Inbox, then Conversations.', 'Press a thread to read it and reply.', 'Assign it to a teammate with the Assign button.'],
  '/staff-centre/tenant-onboarding': ['Open Human Intelligence Hub, Owners & Tenants, then Tenant onboarding.', 'Press Send pack next to the tenant. It appears in their portal and on their secure link.', 'Come back to see who has signed. Press Resend missing for anything outstanding.', 'Bank details in the pack come from Documents, Bank accounts.'],
  '/staff-centre/cohosts': ['Open Owners & Tenants, then Co-hosts.', 'Press Add co-host and choose how we are paid: commission, fee or by contract.', 'Send the agreement link and, once signed, create their portal login.'],
  '/staff-centre/marketing': ['Open Marketing and find the Enquiry form link card on the home page.', 'Press Copy link and send it to the landlord or investor by email or WhatsApp. Under it, One link for all landlords opens a page where existing landlords sign in to the owners portal and new ones open the enquiry form, and One link for all tenants sends existing tenants to the tenants portal and everyone else to the property listings.', 'They choose Guaranteed Rent, Short Let Partnership or Estate Property Management, fill in the form and submit.', 'The enquiry appears in CRM, Pipeline, at Enquiry, with every answer in the notes. Admins can switch the link off.', 'To email everyone who opted in, open Emails and write the email, then press Mailing list (top right), choose the audience (landlord, investor or platform) and press Generate NOVOURQ message (or write your own), tick the documents to include, choose Pictures, PDF or both, and press Send. Or ask Novourq Cloud AI to send it: it queues it in AI Approvals and nothing goes out until you press Approve. Every email has an unsubscribe link. The same window has the sign-up form code for your website.'],
  '/staff-centre/work-hours': ['Open Human Intelligence Hub, Team, then Work Hours (account owner only, plus staff the owner picks).', 'Pick the dates and, if you like, one person.', 'Read sign-in, sign-out, time on the portal and active time for each session.', 'Click a row to see the pages they opened, or Download for payroll (CSV).'],
  '/staff-centre/applications': ['Open Team, then Applications.', 'Open a candidate and press Run AI review for an opinion on their CV, then pick Invite to interview, Make an offer or Decline. The matching message opens addressed to them; press Send.', 'Press Open roles & careers link (top right) and Add a role: title, category, location, type and description.', 'Press Copy link and send it to candidates, or put it on your website.', 'Candidates pick a role and apply. Each application appears here at Applied; move it along as you interview.', 'Open a candidate and use Reply to candidate: choose Acceptance, Decline or Interview invite. The message is written for you with their name and the role. Edit it, press Open in my email and send it, or press Copy. Set stage to moves them along. Nothing is sent by the portal itself.'],
  '/staff-centre/partners': ['Open Partners & Investors, then Partners, then the Agent Programme tab.', 'To create an agent login yourself, press Add agent, fill in name and email, type a password in the Agent portal login box and press Save agent.', 'To record what an agent has earned, press Log guest / tenant, add the value and the Commission earned, and say if it is paid.', 'In Agents, copy the Agent sign-up link and send it to a new agent. They create their login and wait for approval.', 'Press Activate on their row, and use Edit to check their commission rates.', 'Approved agents sign in at the agent portal link and log their own guests and tenants. They appear in the Referral pipeline at Logged; you screen them and mark commission paid.'],
  '/staff-centre/listings': ['Open Marketing, then Listings.', 'Press a property, switch it on and add photos, rent and a description.', 'Under Virtual viewing videos, upload a walk-through video or paste a YouTube or Vimeo link. Add a title such as Living room and kitchen.', 'Press Save. Tenants who cannot visit watch the videos on the property\'s public page and can tick that they want a video call. The request lands in your viewings list marked as a video call.', 'Large videos may be refused. Upload them to YouTube as unlisted and paste the link instead.'],
  '/staff-centre/crew': ['Open Portals, then Cleaners & Maintenance.', 'See each team\'s headcount, who is on shift and open jobs.', 'Press a person to open their portal exactly as they see it.'],
  '/staff-centre/ai-command-centre': ['Open Novourq Cloud AI.', 'Under Where do I go?, press the task you want, such as Approve what the AI drafted, and we open the right page.', 'Or type in the search box, or pick a heading on the left (Control, Skills, Automation, Insight, Tools) to see its pages with a line on each.', 'At a glance, at the bottom, shows what needs you today. Open any tile for the detail. Inside a page, press ← Novourq Cloud AI at the top of the side menu to come back.'],
  '/staff-centre/ai-command-centre/agents': ['Open Novourq Cloud AI, then Skills.', 'Press a skill to read what it does.', 'Switch it on. Anything that changes data still waits for your approval.'],
  '/settings?section=Team+Management': ['Open Settings, then Team Management.', 'Press Invite member, enter their details and choose a role.', 'Press Edit on a person to change access or View only.', 'Press the bin to remove someone. Edit and the bin stay pinned on the right; scroll sideways to see the other columns.'],
}

const SETTINGS: [string, string][] = [
  ['My Account', 'Your name, email and password.'], ['Payments', 'Your plan, invoices and payment method.'], ['System Messages', 'News and updates from Novourq.'],
  ['Submissions', 'Report an issue or bug, leave a review or suggest an idea, and see our replies.'], ['AI Authority', 'Admins choose what the AI does automatically, what waits for a person, and what is off.'],
  ['Phone Assistant', 'Admins link their own mobile, then message or voice-note Novourq Cloud AI on WhatsApp.'], ['Privacy & Data', 'Admins download all company data as a file or request account deletion.'],
]

function path(parts: string[]) { return parts.join(', then ') }
const FOOT = ['If you cannot see this tab, your access may be limited. Ask an admin to unlock it in Settings, Team Management.', 'Still stuck? Ask Novourq Cloud AI in the side panel.']

export function buildGuides(): Guide[] {
  const out: Guide[] = []
  const seen = new Set<string>()
  const add = (g: Omit<Guide, 'full'>) => {
    const id = g.area + '|' + g.title.toLowerCase()
    if (seen.has(id)) return
    seen.add(id)
    const hand = STEPS[g.key]
    out.push({ ...g, steps: hand ?? g.steps, full: !!hand })
  }
  for (const hub of STAFF_HUBS) {
    const human = !NON_HUMAN_HUBS.includes(hub.label)
    const ai = hub.label === 'Novourq Cloud AI'
    const solo = hub.tabs.length === 1
    for (const t of hub.tabs) {
      if (t.hidden && !ai) continue
      if (ai && t.hidden && out.some(o => o.area === 'Novourq Cloud AI' && o.title === t.label)) continue
      const text = TAB_DESCRIPTIONS[t.label] ?? bannerFor(t.href.split('?')[0])?.text ?? ''
      const where = human ? path([`Open ${HUB} in the left menu`, ...(solo ? [`choose ${t.label}`] : [`choose the ${hub.label} group`, `open the ${t.label} tab`])]) : ai ? path(['Open Novourq Cloud AI in the left menu', `open ${t.label}`]) : `Open ${t.label} in the left menu`
      add({ key: t.href, area: ai ? 'Novourq Cloud AI' : human ? HUB : 'Dashboard', group: hub.label, title: t.label, text, steps: [where + '.', ...(text ? [text] : []), ...FOOT] })
    }
  }
  for (const [k, text] of Object.entries(TAB_DESCRIPTIONS)) {
    const m = k.match(/^(pm|estate|str|dev):(.*)$/)
    const name = m ? m[2] : k
    const mod = m ? MODULES[m[1]] : ''
    add({ key: m ? `re:${m[1]}:${name}` : `re:${name}`, area: RE, group: mod || 'All modules', title: name, text,
      steps: [`Open ${RE} in the left menu${mod ? `, choose ${mod}` : ''}, then the ${name} tab.`, text, ...FOOT] })
  }
  for (const [n, text] of SETTINGS) add({ key: `settings:${n}`, area: 'Settings', group: 'Settings', title: n, text, steps: [`Open Settings in the left menu, then ${n}.`, text, ...FOOT] })
  return out
}

export const GUIDE_AREAS = ['All', RE, HUB, 'Novourq Cloud AI', 'Dashboard', 'Settings']
