'use client'
export const dynamic = 'force-dynamic'
// Public landlord page: ONE link for everyone. Existing landlords go to the owners portal, new ones to the enquiry form.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const NAVY = '#16233F'
const card: React.CSSProperties = { display: 'block', background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 14, textDecoration: 'none', color: NAVY, border: '1px solid #DDE3EE' }

export default function LandlordsPage() {
  const { token } = useParams() as { token: string }
  const [live, setLive] = useState<boolean | null>(null)
  useEffect(() => { fetch('/api/public/enquiry?t=' + encodeURIComponent(token)).then(r => setLive(r.ok)).catch(() => setLive(false)) }, [token])
  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '26px 16px 60px', textAlign: 'center' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700 }}>Landlords</h1>
        <div style={{ opacity: .8, fontSize: 14 }}>Choose the option that fits you.</div>
      </div>
      <div style={{ maxWidth: 560, margin: '-36px auto 0', padding: '0 16px 40px' }}>
        {live === false && <div style={{ ...card, cursor: 'default' }}><b>This link is not active.</b><p style={{ color: '#667085', fontSize: 14, margin: '6px 0 0' }}>Please contact us for a new one.</p></div>}
        {live !== false && <>
          <a href="/pm-owner-portal" style={card}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Existing landlord</div>
            <div style={{ fontSize: 14, color: '#475467', margin: '4px 0 10px' }}>Sign in to your NOVOURQ owners portal, or contact your dedicated property manager.</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#2F6DB5' }}>Sign in to the owners portal →</div>
          </a>
          <a href={`/enquire/${encodeURIComponent(token)}`} style={card}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>New enquiry</div>
            <div style={{ fontSize: 14, color: '#475467', margin: '4px 0 10px' }}>Guaranteed Rent, Short Let Partnership or estate property management.</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#2F6DB5' }}>Complete our enquiry form →</div>
          </a>
        </>}
      </div>
    </div>
  )
}
