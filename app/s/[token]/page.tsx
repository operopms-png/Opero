'use client'
export const dynamic = 'force-dynamic'
// The page a recipient opens from a services link: pick each document and view it. No login.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import FillablePdf from '../../../components/FillablePdf'

const NAVY = '#182D5E'
export default function ServicesPage() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useState(0)
  useEffect(() => {
    fetch('/api/public/services?t=' + encodeURIComponent(token)).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setErr(j.error || 'This link is no longer available.'); else setD(j) })
  }, [token])
  const pick = (i: number) => { setCur(i); if (d?.docs[i]) fetch('/api/public/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, doc: d.docs[i].id }) }).catch(() => {}) }
  useEffect(() => { if (d?.docs?.length) pick(0) }, [d])   // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <div style={{ padding: 60, textAlign: 'center', color: '#475467', fontFamily: 'system-ui' }}>{err}</div>
  if (!d) return <div style={{ padding: 60, textAlign: 'center', color: '#98A2B3', fontFamily: 'system-ui' }}>Loading…</div>
  const doc = d.docs[cur]
  return (
    <div style={{ minHeight: '100vh', background: '#F3F6FB', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', color: '#18223a' }}>
      <div style={{ background: NAVY, color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {d.logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.logo} alt="" style={{ height: 40, maxWidth: 120, objectFit: 'contain' }} />}
        <div><div style={{ fontSize: 11, letterSpacing: '.18em', color: '#9FB3DD' }}>{String(d.company || '').toUpperCase()}</div><div style={{ fontSize: 21, fontWeight: 600 }}>{d.name}</div>{d.property && <div style={{ fontSize: 14, color: '#C9D6F2', marginTop: 3 }}>Property: {d.property}</div>}</div>
      </div>
      {d.docs.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#667085' }}>There are no documents to show right now.</div> : (
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 280px', maxWidth: 360 }}>
            {d.docs.map((x: any, i: number) => (
              <div key={x.id} onClick={() => pick(i)} style={{ background: i === cur ? '#EEF2F9' : '#fff', border: '1px solid #D5DCEA', borderLeft: `5px solid ${i === cur ? NAVY : '#D5DCEA'}`, borderRadius: 6, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{x.title}</div>
                {x.description && <div style={{ fontSize: 13, color: '#556', marginTop: 4, lineHeight: 1.45 }}>{x.description}</div>}
              </div>
            ))}
          </div>
          {doc && (
            <div style={{ flex: '2 1 480px', background: '#fff', border: '1px solid #D5DCEA', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: NAVY }}>{doc.title}</div>
                <a href={doc.url} target="_blank" rel="noreferrer" style={{ background: NAVY, color: '#fff', textDecoration: 'none', borderRadius: 5, padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>Open / download PDF</a>
              </div>
              {doc.fillable ? <FillablePdf key={doc.id} url={doc.url} token={token} docId={doc.id} title={doc.title} /> : (<>
                <iframe key={doc.id} src={doc.url} title={doc.title} style={{ width: '100%', height: '78vh', minHeight: 420, border: '1px solid #D5DCEA', borderRadius: 4 }} />
                <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 8 }}>If the document doesn’t show on your phone, press Open / download PDF.</div>
              </>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
