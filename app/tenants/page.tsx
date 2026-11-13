// Public tenant page: ONE link for everyone. Existing tenants go to the tenants portal, people looking for a home go to the listings.
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tenants · NOVOURQ', description: 'Existing tenants and housing enquiries.' }

const NAVY = '#16233F'
const card: React.CSSProperties = { display: 'block', background: '#fff', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 3px rgba(16,24,40,.08)', marginBottom: 14, textDecoration: 'none', color: NAVY, border: '1px solid #DDE3EE' }

export default function TenantsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", color: NAVY }}>
      <div style={{ background: NAVY, color: '#fff', padding: '26px 16px 60px', textAlign: 'center' }}>
        <div style={{ letterSpacing: 4, fontWeight: 700, fontSize: 15 }}>NOVOURQ</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24, fontWeight: 700 }}>Tenants</h1>
        <div style={{ opacity: .8, fontSize: 14 }}>Choose the option that fits you.</div>
      </div>
      <div style={{ maxWidth: 560, margin: '-36px auto 0', padding: '0 16px 40px' }}>
        <a href="/pm-tenant-portal" style={card}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Existing tenant</div>
          <div style={{ fontSize: 14, color: '#475467', margin: '4px 0 10px' }}>Rent payments, maintenance requests, lease renewals and tenancy terminations.</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#2F6DB5' }}>Sign in to the tenants portal →</div>
        </a>
        <a href="/homes" style={card}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Housing enquiries</div>
          <div style={{ fontSize: 14, color: '#475467', margin: '4px 0 10px' }}>Available properties and accommodation enquiries.</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#2F6DB5' }}>View our property portfolio →</div>
        </a>
      </div>
    </div>
  )
}
