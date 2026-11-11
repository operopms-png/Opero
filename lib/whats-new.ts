// What's new in the portal, newest first. Shown at the top of Staff Training so the team
// stays up to date without asking. Add a line here whenever you add, change or remove
// something a user can see (see AGENTS.md). Keep each one to one plain sentence.
export type News = { date: string; title: string; text: string }

export const WHATS_NEW: News[] = [
  { date: '2026-11-11', title: 'Services Pack', text: 'Marketing, Services Pack: send the brochure, landlord pack and flyers by one link. Recipients choose each document to view, and you see opens and views.' },
  { date: '2026-11-11', title: 'HR templates in Documents', text: 'Documents, Templates, Add HR templates: a Payslip and a Proof of employment letter that use your own logo, name and contact lines. Admins only.' },
  { date: '2026-11-11', title: 'HR Documents', text: 'Team, HR Documents: store payslips and HR forms, add the NOVOURQ fillable payslip and proof of employment letter, edit or replace any file and email it to a person. Company Documents can now edit and send files too.' },
  { date: '2026-11-11', title: 'Virtual viewings for tenants', text: 'Listings: upload walk-through videos or paste a YouTube or Vimeo link on a property. Tenants watch them on its public page and can ask for a video call instead of an in-person viewing.' },
  { date: '2026-11-11', title: 'Portal guides in Staff Training', text: 'Every tab now has a how-to guide with steps, pictures and video. New tabs appear here automatically.' },
  { date: '2026-11-11', title: 'Team Management fix', text: 'Edit and the bin stay pinned on the right of the team table, with a scrollbar to see the other columns.' },
  { date: '2026-11-11', title: 'Tenant onboarding pack', text: 'Owners & Tenants, Tenant onboarding: send each new tenant their information sheet, lease with deposit scheme, guides, payment instructions and welcome letter in one go.' },
  { date: '2026-11-10', title: 'Bank accounts for documents', text: 'Documents, Bank accounts: change the deposit and rent account once and every new document uses it.' },
  { date: '2026-11-10', title: 'Co-hosts', text: 'A new client type for people who host properties they do not own: Owners & Tenants, Co-hosts.' },
  { date: '2026-11-10', title: 'Cleaner checklist and maintenance reporting', text: 'Cleaners tick a checklist, add before and after photos and report anything maintenance must fix. Maintenance see it on their board.' },
]
