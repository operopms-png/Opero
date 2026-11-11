import type { Metadata } from 'next'
import Script from 'next/script'
import { serviceClient } from '@/lib/admin-auth'

// Public landlord earnings checker: app.sangstersgroup.com/earnings
// Same form as the website embed (public/sg-earnings.js) — use this link in
// ads, letters and realtor referrals. Add ?src=facebook etc. to track where
// a landlord came from (it shows on the lead in the portal).
export const metadata: Metadata = {
  title: 'What could your property earn? · NOVOURQ',
  description: 'Free earnings estimate for landlords in Jamaica, the UK and the UAE — holiday let and long-term let, based on live listings.',
}

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // A company's own link (?code=...) shows that company's name; the plain link stays NOVOURQ
  const { code } = await searchParams
  let company = 'NOVOURQ', own = false
  if (code && code !== 'sangsters' && code !== 'novourq') {
    const { data: pg } = await serviceClient.from('meeting_booking_pages').select('business_id').eq('code', String(code).slice(0, 40)).eq('enabled', true).maybeSingle()
    if (pg) { const { data: cs } = await serviceClient.from('invoice_settings').select('company_name').eq('business_id', pg.business_id).maybeSingle(); own = true; company = (cs?.company_name as string | undefined)?.trim() || 'Your property team' }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Figtree, -apple-system, sans-serif', color: '#191815' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" />
      <header style={{ borderBottom: '1px solid #ece8df', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
        {!own && <img src="/logo-192.png" alt="NOVOURQ" style={{ width: 40, height: 40, borderRadius: 8 }} />}
        <span style={{ fontWeight: 700, fontSize: 19, color: '#5A4320' }}>{company}</span>
        {!own && <a href="https://sangstersgroup.com" style={{ marginLeft: 'auto', fontSize: 13.5, color: '#191815', fontWeight: 600 }}>thenovourq.com</a>}
      </header>
      <main style={{ padding: '40px 16px 64px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}><div data-sg-earnings="" /></div>
        <div style={{ maxWidth: 980, margin: '28px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {[
            ['Full management', 'Listing, pricing, guests, cleaning and maintenance — handled by our team.'],
            ['Guaranteed rent', 'Prefer a fixed monthly income? Ask us about guaranteed rent.'],
            ['Owner app', 'See bookings, payouts and statements from your phone.'],
          ].map(([t, d]) => (
            <div key={t} style={{ borderTop: '2px solid #191815', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div>
              <div style={{ fontSize: 13.5, color: '#6b675e', lineHeight: 1.5, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </main>
      <Script src="/sg-earnings.js" strategy="afterInteractive" />
    </div>
  )
}
