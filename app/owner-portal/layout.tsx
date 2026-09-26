'use client'
// Owners are investor partners: they land on /partners after sign-in and
// open this portal from there. This bar gives them a way back.
export default function OwnerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: '#1A1A1A', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/partners" style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>← Partners Dashboard</a>
        <span style={{ color: '#FBF4E6', fontSize: 12, opacity: 0.7 }}>Owner Portal</span>
      </div>
      {children}
    </div>
  )
}
