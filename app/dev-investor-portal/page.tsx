'use client'

// Preview only. There is no real off-plan buyer/deposit-plan data
// model yet -- dev_investors is for equity investors (name, investment
// amount, equity %), not off-plan unit buyers on a deposit installment
// plan. This page shows what the portal will look like once that's
// built: real work still needed --
//   1. a table for off-plan reservations (buyer, unit, deposit total,
//      monthly amount, payments made vs remaining, start date)
//   2. portal auth for buyers (same portal_user_id pattern as
//      pm_tenants/estate_tenants)
//   3. a staff-side screen in Developments to create/manage plans
const ACCENT = '#8B5CF6'

export default function DevInvestorPortalPreview() {
  const depositTotal = 5000
  const monthlyAmount = 500
  const months = Math.ceil(depositTotal / monthlyAmount)

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter',sans-serif", padding: '40px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#92400E' }}>
          Preview only — this portal isn't wired to real data yet. Nothing below is live.
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Developments</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#101828' }}>Investor / Off-Plan Buyer Portal</h1>
        <div style={{ fontSize: 14, color: '#667085', marginBottom: 28, lineHeight: 1.5 }}>
          Where an off-plan buyer would log in to see their reservation, deposit plan, and payment history.
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC', padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 4 }}>Example unit reservation</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#101828', marginBottom: 16 }}>Unit 4B — [Project name]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 2 }}>Minimum deposit</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>£{depositTotal.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 2 }}>Monthly installment</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#101828' }}>£{monthlyAmount.toLocaleString()}/mo</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 12 }}>
            £{depositTotal.toLocaleString()} spread over {months} monthly payments of £{monthlyAmount.toLocaleString()} — terms subject to change per project.
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC', padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 12 }}>Payment schedule (example)</div>
          {Array.from({ length: months }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < months - 1 ? '1px solid #F2F4F7' : 'none', fontSize: 13 }}>
              <span style={{ color: '#344054' }}>Month {i + 1}</span>
              <span style={{ color: '#101828', fontWeight: 600 }}>£{monthlyAmount.toLocaleString()}</span>
              <span style={{ color: i === 0 ? '#10B981' : '#98A2B3', fontWeight: 600 }}>{i === 0 ? 'Paid' : 'Upcoming'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
