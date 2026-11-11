'use client'
// The tenant's Onboarding tab: every document in the tenancy pack, one by one, to view and sign.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: bg, color: fg, whiteSpace: 'nowrap' })
const ST: Record<string, [string, string, string]> = { ready: ['Ready', '#E3EDFA', '#2F6DB5'], to_sign: ['To sign', '#FFF4E0', '#B54708'], signed: ['Signed', '#E7F6EC', '#067647'], not_sent: ['Coming soon', '#F2F4F7', '#667085'], preparing: ['Being prepared', '#F2F4F7', '#667085'] }

export default function TenancyPack({ kind, id, link, accent = '#2F6DB5' }: { kind?: 'pm_tenant' | 'ea_tenant'; id?: string; link?: string; accent?: string }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { (async () => {
    const headers: Record<string, string> = {}
    if (link) headers['x-client-link'] = link
    else { const { data: { session } } = await supabase.auth.getSession(); headers.Authorization = `Bearer ${session?.access_token ?? ''}` }
    const r = await fetch('/api/tenancy-pack' + (id && kind ? `?kind=${kind}&id=${id}` : ''), { headers })
    const j = await r.json().catch(() => ({})); if (r.ok) setItems(j.items); else setErr(j.error || 'Could not load your documents.')
  })() }, [kind, id, link])
  if (err) return <div style={{ color: '#B42318', fontSize: 13 }}>{err}</div>
  if (!items) return <div style={{ color: '#98A2B3', fontSize: 13, padding: 20 }}>Loading…</div>
  const todo = items.filter(i => i.state === 'to_sign').length
  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>Your tenancy documents</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>{todo > 0 ? `${todo} to sign. Open each one below.` : 'Everything you need for your tenancy, in one place.'}</div>
      </div>
      {items.map(it => {
        const st = ST[it.state] || ST.ready
        const href = it.type === 'file' ? it.url : it.token ? `/sign/${it.token}` : null
        const label = it.state === 'to_sign' ? 'Review and sign' : it.state === 'signed' ? 'View signed copy' : 'View'
        return (
          <div key={it.key} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>{it.title}</div><span style={pill(st[1], st[2])}>{st[0]}</span></div>
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>{it.note}</div>
            {href && <a href={href} target={it.type === 'file' ? '_blank' : undefined} rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 9, padding: '10px', borderRadius: 9, background: it.state === 'to_sign' ? accent : '#fff', color: it.state === 'to_sign' ? '#fff' : accent, border: `1px solid ${accent}`, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{label}</a>}
          </div>)
      })}
    </div>
  )
}
