'use client'
// Staff Training → Who we are: NOVOURQ's official wording on what the company is, so staff never need to ask.
// Shown for NOVOURQ's own company only. The same wording is in the AI guide (lib/portal-guide.ts), the website chat and the AI receptionist.
import { C } from '../crm/Page'

export const WHO_WE_ARE = [
  'Novourq provides ready-to-live-in homes with flexible terms, from a few weeks to a year or more, backed by advanced AI technology.',
  'We secure homes from owners, fit them out, run them day to day, and rent them to professionals, relocating families and companies that need somewhere to stay.',
  'We earn from the margin between what we pay owners and what residents pay, along with corporate housing agreements and extra services.',
  'Our AI platform, Novourq Cloud, handles the day-to-day work, and our team signs off on key decisions.',
]
const USE = ['Ready-to-live-in homes', 'Furnished apartments', 'Flexible terms, from a few weeks to a year or more', 'Novourq Cloud']
const AVOID = ['Short-term rentals', '6 to 12 month stays', 'AI-run property business']

const card: React.CSSProperties = { background: '#fff', border: '1px solid #D0D5DD', borderRadius: 10, padding: '14px 18px' }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2F6DB5', margin: '0 0 8px' }

export default function WhoWeAre() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <div style={{ ...card, borderLeft: '5px solid #1B2F6E', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={h}>Who we are. Say this</div>
        {WHO_WE_ARE.map(t => <p key={t} style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.ink }}>{t}</p>)}
        <div style={{ fontSize: 12.5, color: '#667085' }}>Use this wording with landlords, hosts, residents, companies and anyone who asks. You do not need to check it with anyone.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        <div style={card}><div style={h}>Words to use</div><ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>{USE.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div style={card}><div style={{ ...h, color: '#9B2C2C' }}>Words not to use</div><ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>{AVOID.map(t => <li key={t}>{t}</li>)}</ul></div>
      </div>
      <div style={{ ...card, fontSize: 14, lineHeight: 1.55 }}>
        <div style={h}>Not sure what to say?</div>
        Ask Novourq Cloud AI, it uses this same wording. A one-page PDF copy is in Human Intelligence Hub → Company → Company Documents → About NOVOURQ folder (press Add NOVOURQ documents if it is not there yet).
      </div>
    </div>
  )
}
