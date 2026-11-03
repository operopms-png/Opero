import { ReactNode } from 'react'
export const link = { color: '#2B7BB9' } as const
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', -apple-system, sans-serif", padding: '32px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: 'clamp(20px, 5vw, 48px)' }}>
        <a href="/login" style={{ fontSize: 13, color: '#2B7BB9', textDecoration: 'none' }}>← Back to Novourq</a>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#323338', margin: '20px 0 4px' }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#98A2B3', margin: '0 0 28px' }}>Last updated: {updated}</p>
        <div style={{ fontSize: 14, color: '#344054', lineHeight: 1.7 }}>{children}</div>
        <p style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #E4E7EC', fontSize: 13 }}>
          <a href="/terms" style={link}>Terms of Service</a> · <a href="/privacy" style={link}>Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
export function H({ children }: { children: ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: '#323338', margin: '26px 0 8px' }}>{children}</h2>
}
