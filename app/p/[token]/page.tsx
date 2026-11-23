'use client'
export const dynamic = 'force-dynamic'
// The page an investor opens from a pack link: the full investment pack, read only. No login.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PackView from '@/components/packs/PackView'
import { cleanPack } from '@/lib/pack-calc'

export default function PackPage() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch('/api/public/pack?t=' + encodeURIComponent(token)).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'This link is no longer available.'); else setD(j) }).catch(() => setErr('This link is no longer available.'))
  }, [token])
  if (err) return <div style={{ padding: 60, textAlign: 'center', color: '#475467', fontFamily: 'system-ui' }}>{err}</div>
  if (!d) return <div style={{ padding: 60, textAlign: 'center', color: '#98A2B3', fontFamily: 'system-ui' }}>Loading…</div>
  return (
    <div style={{ minHeight: '100vh', background: '#F2F5F9', padding: '16px 12px 40px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}><PackView data={cleanPack(d.data)} name={d.name} company={d.company} /></div>
    </div>
  )
}
