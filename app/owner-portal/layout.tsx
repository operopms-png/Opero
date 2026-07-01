'use client'
export default function OwnerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {children}
    </div>
  )
}
