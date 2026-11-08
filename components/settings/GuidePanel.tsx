'use client'
// Help Centre -> Step-by-step guide (app/help/page.tsx): plain-English how-to for people using the platform.
import { useState } from 'react'

const SECTIONS: { id: string; title: string; steps: string[] }[] = [
  { id: 'start', title: 'Getting started', steps: [
    'Open Settings, then My Account, and check your name and email are right.',
    'Under Payments, check your plan. Under Team Management, invite the people who will use Novourq with you and choose what each of them can see. Edit a team member to give them modules, then untick any Human Intelligence Hub tab you want locked for them: Novourq Cloud AI, Data Hub, Company Documents, CRM, Landlord Leads, Client Properties, Invoices, Approvals, Announcements, Activity Log and more. Only admins can unlock a tab again.',
    'Team Management also shows Novourq Cloud AI, the one AI that works for your whole business. It is the same for every account. You see its skills and when it hands over to a person, but you do not add or edit AI staff.',
    'Set up your email branding in Invoice settings: add your company name, logo and contact details. Every email Novourq sends for you uses them, so it looks like it came from your company.',
    'Add your first properties in Real Estate Intelligence. Everything else builds on them.',
  ] },
  { id: 'rei', title: 'Real Estate Intelligence', steps: [
    'Real Estate Intelligence is where your records live: properties, landlords, tenants, leases, rent, maintenance, compliance and more.',
    'Pick a module, then a tab. Each tab opens with a blue banner that says what it does.',
    'Add or edit records with the buttons on each tab. Novourq Cloud AI reads these records to do its work, so the more complete they are, the better it works.',
    'Legal and disputes (under Compliance) records eviction notices, arrears claims and deposit disputes with their next deadline, and the deadline also shows in Deadlines. It is a register only: it gives no legal advice and contacts no one. Referrals (under Lettings and sales) records who referred whom and any reward owed. Nothing is paid from it. Landlord Feedback and Tenant Feedback (under Lettings and sales) show the star ratings and comments that landlords and tenants write in the new Feedback tab of their own portals. Mark each Seen or Actioned. The team gets a bell notification for every new one. Press Reply to answer: the reply shows in their own Feedback tab and is also emailed to them (email and portal only, no texts). People only see their own feedback. Valuations (under Finance) records each property\'s value over time and the change since the last one.',
    'At a glance sits at the bottom of the Real Estate Intelligence page: headline tiles for Short term rentals, Lettings, Estate agency and Developments, such as occupancy, rent collected, arrears, viewings, budget spent and snags open. You only see the areas you can open, each tile opens its page, and it only reads what is already in Novourq. Estate agency has no offers or sales pipeline records yet, so there is no tile for them.',
    'Rent Reviews (under Lettings and sales) lists each lease\'s next review date with the current and proposed rent; use the buttons to mark the notice sent and agreed. It is a list and reminder only: it does not send the notice or change the rent. Service Charges (under Finance) records service charge, ground rent and sinking fund per property with who it is paid to and when it is due; press Mark paid, then Next period. Planned Maintenance (under Operations) holds recurring jobs such as boiler services; press Done to record it and set the next date. It does not raise repair jobs by itself. Each day Novourq Cloud AI checks Rent Reviews, Service Charges and Planned Maintenance and leaves one task listing what is due or overdue. It only lists: it never sends a notice, pays a charge or books a job. Switch each one on or off in Novourq Cloud AI under Agents. Emergency Contacts (under Operations) holds the plumber, electrician, gas engineer, key holder and out-of-hours numbers for a property or for all of them. Contractors (under Operations) opens your contractors and suppliers with their work orders.',
  ] },
  { id: 'hih', title: 'Human Intelligence Hub', steps: [
    'The Human Intelligence Hub covers your customers, team and finances: inbox, website chats, CRM, invoices, arrears, tasks, people and training.',
    'Use it for the day-to-day running of your company. Novourq Cloud AI works the same areas in the background.',
    'Under Team, Activity Log records who changed what and when. Admins and co-founders see every change in the company. Everyone else sees only their own. Changes made by Novourq Cloud AI or an automatic job show as "Novourq Cloud AI or system". Bank and ID details are never stored in it.',
  ] },
  { id: 'ai', title: 'Novourq Cloud AI', steps: [
    'Novourq Cloud AI is one assistant with many skills, such as rent reminders, chasing invoices, replying to reviews and watching compliance dates.',
    'Open Workflows to see every skill. Switch a skill on or off, and choose "Send automatically" if you want it to send without waiting for you.',
    'Novourq Cloud AI has its own picture: the Novourq symbol as a glossy 3D mark on a blue glow. It plays as a short looping animation on the AI pages and the Dashboard AI panel. The Voice button is a light blue pill with the blue logo animating on it, with no box behind it. Devices set to reduce motion show the still picture.',
    'Press "Run all now" to make the AI check everything straight away. It also runs by itself every day.',
    'Anything involving money or a legal contract always waits for your approval. You will find these in the approvals list.',
    'Ask the AI panel anything about the platform, such as "how do I add a tenant?", and it will answer or point you to the right page.',
  ] },
  { id: 'rent', title: 'Rent reminders', steps: [
    'Rent reminders go out in timed windows: before the due date, on the day, and then at stages after it if rent is late.',
    'Each reminder goes by email and to the tenant portal. No text messages are sent.',
    'You can see what was sent, and to whom, on the Reminders page in Finance.',
  ] },
  { id: 'chat', title: 'Website chat and viewings', steps: [
    'To connect your own email: open Human Intelligence Hub, then Inbox, then Email, then Mailbox settings. The quickest way is Sign in with Google or Sign in with Microsoft: you approve access on their own page and we never see your password. Otherwise an admin presses Add mailbox and types the address, then presses Connect. Pick where it is hosted (Gmail or Google Workspace, Microsoft 365 or Outlook, website hosting, or another provider), enter the password and press Connect. Gmail needs an app password and some Microsoft 365 accounts need their admin to allow IMAP and SMTP. Each mailbox can be shared with chosen team members. Your emails are stored encrypted and only your company sees them.',
    'Email works on your phone too: the list of emails fills the screen, tap one to read it and press Back to Inbox to return. Press Folders to switch folder or mailbox, or open Email templates and Mailbox settings, and + New to write an email.',
    'To connect your own website chat: open Human Intelligence Hub, then Inbox, then Website Chats. Your own chat is set up automatically. Copy the one line of code under Add it to your website and paste it into your website footer or custom code area (WordPress, Elementor, Wix and Squarespace all have one). Chats then appear in the same tab and the AI answers using your settings.',
    'The website chat answers visitors, saves new leads and can book viewings.',
    'If your website has a careers form, each application appears in Human Intelligence Hub, then Team, then Applications. The applicant is also added to the CRM as a contact, with no deal, because they are not a sale.',
    'Landlord and tenant feedback is under Real Estate Intelligence, Landlord Feedback or Tenant Feedback. Reply to any item: the person gets an email and sees your reply in the Feedback tab of their portal, where they can answer back. When feedback or an answer arrives, your owner, Admin, Co Founder and Property Management Team members are emailed with a link, and the item goes back to New.',
    'Signing documents with initials and dates: in Staff Centre, Documents, open a template and press + Initials box or + Date box where the signer must initial a section or pick a date (also + Insert blank for anything else). When you send it, the client opens the link on their phone, works through each box with a progress bar and a Fill my initials shortcut, then draws or types a signature and presses Finish and sign. The signed PDF shows signature, initials, dates, time and IP, is emailed to both sides, and for an owner or tenant is filed automatically in their Documents (and their portal). You can fill dates yourself before sending.',
    'Head lease documents: in Real Estate Intelligence, Head Leases, press Documents on a lease (shows how many of the 5 key documents are filled). Upload the master lease agreement, head lessor documents, landlord ID (with its expiry date), proof of ownership and change of electricity papers, plus any other files, as PDF, Word or photo up to 15 MB. Files are private to your company and open through links that last 5 minutes. Admins, Co Founders and property teams only. Landlord ID shows a warning 90 days before it expires. Owners and Tenants: press Documents on an owner or tenant for the same checklist (owners: ID, proof of ownership, management agreement, proof of address, bank details; tenants: tenancy agreement, ID, right to rent, proof of income, references). Each file is marked In portal or Staff only, and In portal files show automatically in that owner\'s Documents tab or that tenant\'s Documents tab, with a note of what is still needed. Estate Agency owners and tenants work the same way (Estate Agency, Landlords and Tenants, press Documents) and show in the Estate Agency portals. Document hub: owners and tenants can upload their own files in the portal Documents tab (Take photo or upload) and see a progress bar and what is still needed. Their uploads wait in Staff Centre, Documents, under To review, where you press View, Approve or Reject (a reason is required and is emailed to them). Rejected files show them why so they can upload again. Under Still missing documents, tick people and press Ask selected (or Chase on one person, or Ask them for missing documents inside a Documents window) to email what is missing with a link to their portal. After the first ask, reminders go out automatically every 3 days, up to 5, until they finish; people who were never asked get none. Reminders and asks need email set up and the person to have an email address. Old tenant files: in Property Management, Tenants, a Move to private button appears while older tenant files sit in the open All files list; it moves them (admins and Co Founders, 25 at a time) into each tenant\'s private Documents, keeping In portal choices. Lease signing: tenancy and lease sign pages now also ask the signer to initial the term, rent, deposit and contract sections before signing. Secure link: in an owner\'s or tenant\'s Documents window press Email secure link (sends them an email) or Get link and WhatsApp text (copy the link or the ready-made message into WhatsApp). The link opens a private page with no login that shows contracts to sign, documents to upload (take a photo or upload), invoices and rent to pay by card, and files you shared. It works for 14 days; a new press gives a fresh link. Templates accept a Word (.docx) or a PDF: Staff Centre, Documents, Templates, open a template, press Upload Word or PDF (admins only). A PDF is read as text, up to 4 MB, and turned into headings and paragraphs you can edit, so check the wording and layout after; a scanned PDF (a picture of pages) has no text and is refused, use the Word version instead. Finding it: Human Intelligence Hub, Clients and sales, Owners & Tenants, then the Documents tab along the top. New client link (for someone not in the system yet): Staff Centre, Documents, press New client link at the top. Choose owner or tenant, Property Management or Estate Agency, the contract they sign (a template that needs a signature, optional), and whether to ask for ID and documents, then press Create link and copy the link or the WhatsApp message. They open it on their phone, enter name, email, phone and property, upload documents, then read, initial and sign the contract. Their owner or tenant record is created as soon as they save their details (it may be left behind if they stop part way), their uploads wait in Documents under To review, the signed contract files itself in their Documents, and you get a notification. The list under Create link shows each link as Not opened, In progress, Finished or Expired. Links last 14 days; anyone holding one can fill it in, so send it only to that person. A finished client can then be sent a secure link as usual. Contracts and invoices appear on it when they were sent to that person from Staff Centre, Documents or Finance, Invoices (pick the person from the list). Pay now by card needs Stripe connected under Settings, Payments, and the invoice marked as sent; paid invoices mark themselves paid, other invoices can still be paid by bank transfer. Chase and automatic reminder emails now use the secure link too. Anyone holding the link can see that person\'s documents until it expires, so send it only to them.',
    'Guest check-in (short lets): in Vacation Rentals, Guest Check-ins. Guests get a link by email 3 days before arrival (reminder 2 days before) and on their phone enter their details, upload a photo ID, save a card for the security deposit and sign the house rules. To switch it on, edit a property and turn on Online check-in, set the Security deposit and the Check-in terms (if empty the house rules are used). You can also press Send link on any booking. The deposit is a saved card, not a hold: nothing is charged unless you press Charge damage (never more than the deposit); Release deposit forgets the card. ID photos are private and deleted 30 days after check-out. Needs Stripe connected for the card step.',
    'When you stop managing a property, open Real Estate Intelligence, then Properties, and press No longer managed (or the same button under Vacation Rentals, Properties). Choose the date and reason. The property leaves your active lists, counts, website and the AI, but its bookings, rent, documents and history are kept. Find it again under the Former filter and press Restore to bring it back. Restoring does not switch its website listing back on. Delete is different: it erases the property for good.',
    'Ask Novourq Cloud AI about money, the books or tax and it answers like a careful property accountant: it shows its workings, labels estimates, flags problems in your books and uses the right country\'s rules. Turn on Search the web so it checks current rates and thresholds. It is an AI, not a qualified accountant, so have your own accountant review VAT returns, accounts and tax filings.',
    'Viewings it books appear in Viewings, and the person receives a confirmation email.',
  ] },
  { id: 'voice', title: 'Novourq Voice', steps: [
    'Press the navy Novourq Voice button at the bottom right of any page to start a call with the AI. Say what you want, such as "add a repair at Oak Court" or "find me two-bed deals in Leeds", and it does it.',
    'The pencil button next to it types what you say into the box you have open. The speaker button turns the AI replying out loud on or off.',
    'In Settings, Voice, choose a Woman or Man voice, add words and shortcuts, and read or delete past call transcripts.',
    'Tenants and landlords have their own version in their portal. It only knows their own records and can report repairs or pass messages to you.',
    'Anything involving money or a contract still waits for your approval.',
  ] },
  { id: 'map', title: 'Map, floors and walk-through', steps: [
    'Open Real Estate Intelligence, then Overview, then Map. Every property and deal the AI found is a pin coloured by status: let, vacant, rent behind, certificate due.',
    'Click a pin to see the tenant, rent and what needs doing. Use the filters, and the UK and Jamaica buttons, to narrow it. Press 3D for a tilted view of the real buildings.',
    'For a property in a building, press View floors to see every flat by floor with its rent and status.',
    'Click a flat, then Add floor plan. Upload the plan and press Read plan with AI, or draw the rooms. Check the sizes and Save rooms.',
    'Then press View in 3D and walk to see a furnished model of the flat. Plan turns the model, Walk is first person, and Tour starts outside the building and then shows a person walking through every room while the camera follows. Save as video records the tour and downloads it. If a property is missing from the map, check its address.',
    'Showcase a development: your Development projects show as teal In development pins (set the project Location). Select one, press View floors for its units by floor with prices, then add each unit floor plan and walk through it in 3D before it is built.',
  ] },
  { id: 'datahub', title: 'Data Hub', steps: [
    'Admins open Human Intelligence Hub, then Oversight, then Data Hub. It shows what is stored, how complete it is, where it came from and what the AI changed.',
    'Tenants and landlords ask to download, correct or delete their data from the My Data tab in their portal. Their requests arrive in the Data Hub, where you mark them completed or declined.',
  ] },
  { id: 'help', title: 'Getting help', steps: [
    'Open the Help Centre in the left menu, just above Settings. Video walkthroughs sit beside this guide, one for each part of Novourq.',
    'Ask the AI panel first. It knows the platform and answers straight away.',
    'Found something broken, or want to leave a review or suggest an idea? Use the Submissions tab in Settings. We read every one and reply there.',
    'News and updates from us appear under System Messages.',
  ] },
]

export default function GuidePanel() {
  const [open, setOpen] = useState<string>('start')
  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Step-by-step guide</h2>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 20 }}>How to get the most out of Novourq, step by step.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SECTIONS.map(s => {
          const isOpen = open === s.id
          return (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? '' : s.id)} aria-expanded={isOpen} aria-controls={'guide-' + s.id}
                style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: isOpen ? '#F4F9FD' : '#fff', border: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#323338', fontFamily: 'inherit', textAlign: 'left' }}>
                {s.title}<span aria-hidden="true" style={{ color: '#98A2B3' }}>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <ol id={'guide-' + s.id} style={{ margin: 0, padding: '4px 18px 16px 40px', fontSize: 14, color: '#344054', lineHeight: 1.6 }}>
                  {s.steps.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
                </ol>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
