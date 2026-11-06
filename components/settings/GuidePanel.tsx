'use client'
// Help Centre -> Step-by-step guide (app/help/page.tsx): plain-English how-to for people using the platform.
import { useState } from 'react'

const SECTIONS: { id: string; title: string; steps: string[] }[] = [
  { id: 'start', title: 'Getting started', steps: [
    'Open Settings, then My Account, and check your name and email are right.',
    'Under Payments, check your plan. Under Team Management, invite the people who will use Novourq with you and choose what each of them can see.',
    'Team Management also shows Novourq Cloud AI, the one AI that works for your whole business. It is the same for every account. You see its skills and when it hands over to a person, but you do not add or edit AI staff.',
    'Set up your email branding in Invoice settings: add your company name, logo and contact details. Every email Novourq sends for you uses them, so it looks like it came from your company.',
    'Add your first properties in Real Estate Intelligence. Everything else builds on them.',
  ] },
  { id: 'rei', title: 'Real Estate Intelligence', steps: [
    'Real Estate Intelligence is where your records live: properties, landlords, tenants, leases, rent, maintenance, compliance and more.',
    'Pick a module, then a tab. Each tab opens with a blue banner that says what it does.',
    'Add or edit records with the buttons on each tab. Novourq Cloud AI reads these records to do its work, so the more complete they are, the better it works.',
    'Legal and disputes (under Compliance) records eviction notices, arrears claims and deposit disputes with their next deadline, and the deadline also shows in Deadlines. It is a register only: it gives no legal advice and contacts no one. Referrals (under Lettings and sales) records who referred whom and any reward owed. Nothing is paid from it. Landlord Feedback and Tenant Feedback (under Lettings and sales) show the star ratings and comments that landlords and tenants write in the new Feedback tab of their own portals. Mark each Seen or Actioned. The team gets a bell notification for every new one. Press Reply to answer: the reply shows in their own Feedback tab and is also emailed to them (email and portal only, no texts). People only see their own feedback. Valuations (under Finance) records each property\'s value over time and the change since the last one.',
  ] },
  { id: 'hih', title: 'Human Intelligence Hub', steps: [
    'The Human Intelligence Hub covers your customers, team and finances: inbox, website chats, CRM, invoices, arrears, tasks, people and training.',
    'Use it for the day-to-day running of your company. Novourq Cloud AI works the same areas in the background.',
    'Under Team, Activity Log records who changed what and when. Admins and co-founders see every change in the company. Everyone else sees only their own. Changes made by Novourq Cloud AI or an automatic job show as "Novourq Cloud AI or system". Bank and ID details are never stored in it.',
  ] },
  { id: 'ai', title: 'Novourq Cloud AI', steps: [
    'Novourq Cloud AI is one assistant with many skills, such as rent reminders, chasing invoices, replying to reviews and watching compliance dates.',
    'Open Workflows to see every skill. Switch a skill on or off, and choose "Send automatically" if you want it to send without waiting for you.',
    'Novourq Cloud AI has its own picture: the Novourq symbol as a glossy 3D mark on a blue glow. It plays as a short looping animation on the AI pages and the Dashboard AI panel, and is a still picture on the small Voice button, where it pulses while the AI is working or speaking. Devices set to reduce motion show the still picture.',
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
    'To connect your own website chat: open Human Intelligence Hub, then Inbox, then Website Chats. Your own chat is set up automatically. Copy the one line of code under Add it to your website and paste it into your website footer or custom code area (WordPress, Elementor, Wix and Squarespace all have one). Chats then appear in the same tab and the AI answers using your settings.',
    'The website chat answers visitors, saves new leads and can book viewings.',
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
