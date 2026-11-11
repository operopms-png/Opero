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
  '/staff-centre/landlord-leads': ['Open Landlord Leads and press Link & embed code.', 'Copy your own checker link for ads and letters, or the embed code for your website.', 'New landlords appear here and in your CRM. Move each one along as you contact them and book a valuation.'],
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
  '/staff-centre/listings': ['Open Marketing, then Listings.', 'Press a property, switch it on and add photos, rent and a description.', 'Under Virtual viewing videos, upload a walk-through video or paste a YouTube or Vimeo link. Add a title such as Living room and kitchen.', 'Press Save. Tenants who cannot visit watch the videos on the property\'s public page and can tick that they want a video call. The request lands in your viewings list marked as a video call.', 'Large videos may be refused. Upload them to YouTube as unlisted and paste the link instead.'],
  '/staff-centre/crew': ['Open Portals, then Cleaners & Maintenance.', 'See each team\'s headcount, who is on shift and open jobs.', 'Press a person to open their portal exactly as they see it.'],
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
