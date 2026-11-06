'use client'

// Team Management: the AI that works for every Novourq account. One AI, Novourq Cloud AI,
// with the same skills for everyone. Nothing here is edited per account.

const SKILLS: { skill: string; does: string }[] = [
  { skill: 'Property management', does: 'Daily checks across properties, tenancies, tenant messages, viewings, vacancies and maintenance.' },
  { skill: 'Rent and invoices', does: 'Sends rent reminders by email and the tenant portal, chases overdue invoices and flags arrears.' },
  { skill: 'Finance and tax', does: 'Keeps income and costs in order, prepares reports and reminds you of tax and filing dates.' },
  { skill: 'Maintenance', does: 'Logs repair requests, sets priority and follows each job through to completion.' },
  { skill: 'Compliance and risk', does: 'Watches certificates, licences and tenancy checks, and reports anything that is due or breached.' },
  { skill: 'Deals and acquisitions', does: 'Runs the Deal Analyser and watchlist and gives a recommendation with the figures behind it.' },
  { skill: 'Inbox and reception', does: 'Answers enquiries, routes messages to the right person and logs contacts in the CRM.' },
  { skill: 'Schedule and reviews', does: 'Keeps the calendar and tasks organised, and replies to guest reviews.' },
]

const HANDS_OVER = 'Anything involving money or a legal contract always waits for a person to approve. It also hands over complaints, safety issues, notices and anything it is unsure about.'

export default function AIStaffSection() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1D4E89' }}>Novourq Cloud AI</div>
        <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>One AI works for your whole business. It is the same for every account, and these are its skills.</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Skill', 'Does day to day'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E4E7EC' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILLS.map(s => (
                <tr key={s.skill}>
                  <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#1D4E89', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.skill}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '1px solid #F2F4F7', color: '#344054', minWidth: 240 }}>{s.does}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#344054', background: '#F9FAFB' }}>
          <strong style={{ color: '#1D4E89' }}>Hands over to a person: </strong>{HANDS_OVER}
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#667085', marginTop: 8 }}>Switch skills on or off, and choose what sends automatically, in Settings under AI Authority and in Novourq Cloud AI under Workflows.</div>
    </div>
  )
}
