'use client'
// Settings -> Guide: plain-English how-to for people using the platform.
import { useState } from 'react'

const SECTIONS: { id: string; title: string; steps: string[] }[] = [
  { id: 'start', title: 'Getting started', steps: [
    'Open Settings, then My Account, and check your name and email are right.',
    'Under Payments, check your plan. Under Team Management, invite the people who will use Novourq with you and choose what each of them can see.',
    'Set up your email branding in Invoice settings: add your company name, logo and contact details. Every email Novourq sends for you uses them, so it looks like it came from your company.',
    'Add your first properties in Real Estate Intelligence. Everything else builds on them.',
  ] },
  { id: 'rei', title: 'Real Estate Intelligence', steps: [
    'Real Estate Intelligence is where your records live: properties, landlords, tenants, leases, rent, maintenance, compliance and more.',
    'Pick a module, then a tab. Each tab opens with a blue banner that says what it does.',
    'Add or edit records with the buttons on each tab. Novourq Cloud AI reads these records to do its work, so the more complete they are, the better it works.',
  ] },
  { id: 'hih', title: 'Human Intelligence Hub', steps: [
    'The Human Intelligence Hub covers your customers, team and finances: inbox, website chats, CRM, invoices, arrears, tasks, people and training.',
    'Use it for the day-to-day running of your company. Novourq Cloud AI works the same areas in the background.',
  ] },
  { id: 'ai', title: 'Novourq Cloud AI', steps: [
    'Novourq Cloud AI is one assistant with many skills, such as rent reminders, chasing invoices, replying to reviews and watching compliance dates.',
    'Open Workflows to see every skill. Switch a skill on or off, and choose "Send automatically" if you want it to send without waiting for you.',
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
    'The website chat answers visitors, saves new leads and can book viewings.',
    'Viewings it books appear in Viewings, and the person receives a confirmation email.',
  ] },
  { id: 'help', title: 'Getting help', steps: [
    'Ask the AI panel first. It knows the platform and answers straight away.',
    'Found something broken, or want to leave a review or suggest an idea? Use the Submissions tab in Settings. We read every one and reply there.',
    'News and updates from us appear under System Messages.',
  ] },
]

export default function GuidePanel() {
  const [open, setOpen] = useState<string>('start')
  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#323338', margin: '0 0 4px' }}>Guide</h2>
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
