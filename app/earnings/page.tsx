import type { Metadata } from 'next'
import Script from 'next/script'

// Public landlord earnings checker: app.sangstersgroup.com/earnings
// Same form as the website embed (public/sg-earnings.js) — use this link in
// ads, letters and realtor referrals. Add ?src=facebook etc. to track where
// a landlord came from (it shows on the lead in the portal).
export const metadata: Metadata = {
  title: 'What could your property earn? · Sangsters',
  description: 'Free earnings estimate for landlords in Jamaica, the UK and the UAE — holiday let and long-term let, based on live listings.',
}

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'Figtree, -apple-system, sans-serif', color: '#191815' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" />
      <header style={{ borderBottom: '1px solid #ece8df', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
        <img src="/logo-192.png" alt="Sangsters" style={{ width: 40, height: 40, borderRadius: 8 }} />
        <span style={{ fontWeight: 700, fontSize: 19, color: '#5A4320' }}>Sangsters</span>
        <a href="https://sangstersgroup.com" style={{ marginLeft: 'auto', fontSize: 13.5, color: '#191815', fontWeight: 600 }}>sangstersgroup.com</a>
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
