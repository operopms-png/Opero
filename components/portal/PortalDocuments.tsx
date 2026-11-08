'use client'
// The owner's / tenant's own documents in their portal, connected to the checklist their property manager keeps.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PortalDocuments({ kind, id, accent = '#2F6DB5' }: { kind: 'landlord' | 'tenant'; id?: string; accent?: string }) {
  const [d, setD] = useState<{ files: any[]; missing: any[] } | null>(null)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/portal-docs?kind=${kind}${id ? '&id=' + id : ''}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
      if (res.ok) setD(await res.json())
    })()
  }, [kind, id])
  if (!d || (!d.files.length && !d.missing.length)) return null
  const soon = (x?: string) => x && Math.ceil((new Date(x).getTime() - Date.now()) / 864e5) < 90
  return (
    <div style={{ marginBottom: 16 }}>
      {d.files.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.files.map(f => (
          <a key={f.id} href={f.url || '#'} target="_blank" rel="noreferrer" style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E7EC', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#323338' }}>{f.name}</div>
              <div style={{ fontSize: 11, color: soon(f.expires_on) ? '#B54708' : '#667085', marginTop: 2 }}>{f.category}{f.expires_on ? ` · Expires ${new Date(f.expires_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>View →</span>
          </a>
        ))}
      </div>}
      {d.missing.length > 0 && <div style={{ marginTop: 12, background: '#FFF9EB', border: '1px solid #F5E1A4', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7A5A00', marginBottom: 6 }}>Still needed by your property manager</div>
        {d.missing.map((m: any) => <div key={m.label} style={{ fontSize: 12.5, color: '#5C4A12', marginTop: 3 }}>{m.label} <span style={{ color: '#94803F' }}>· {m.hint}</span></div>)}
        <div style={{ fontSize: 11.5, color: '#94803F', marginTop: 8 }}>Send these to your property manager and they will appear here once added.</div>
      </div>}
    </div>
  )
}
