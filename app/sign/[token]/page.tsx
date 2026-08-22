'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'

// Handles both PM leases and Estate Agency tenancies through the same
// public signing page -- the API tells us which "kind" it is and we
// normalise the slightly different field names (monthly_rent vs rent,
// pm_units vs no unit) into one shape for rendering.
type Kind = 'pm_lease' | 'estate_tenancy'

type RawRecord = {
  id: string
  start_date: string | null
  end_date: string | null
  monthly_rent?: number | null
  rent?: number | null
  deposit: number | null
  tenant_signed_at: string | null
  landlord_signed_at: string | null
  document_url: string | null
  pm_tenants?: { name: string; email: string } | null
  pm_properties?: { name: string } | null
  pm_units?: { unit_number: string } | null
  estate_tenants?: { name: string; email: string } | null
  estate_properties?: { name: string } | null
}

export default function SignLeasePage({ params }: { params: { token: string } }) {
  const [kind, setKind] = useState<Kind | null>(null)
  const [record, setRecord] = useState<RawRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed')
  const [signerName, setSignerName] = useState('')
  const [typedSig, setTypedSig] = useState('')
  const [hasDrawn, setHasDrawn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signedResult, setSignedResult] = useState<{ signed_at: string; document_hash: string } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    fetch(`/api/lease-sign?token=${params.token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setKind(data.kind)
        setRecord(data.lease)
        const tenantName = data.kind === 'pm_lease' ? data.lease?.pm_tenants?.name : data.lease?.estate_tenants?.name
        setSignerName(tenantName || '')
        setLoading(false)
      })
      .catch(() => { setError('Could not load this document'); setLoading(false) })
  }, [params.token])

  useEffect(() => {
    if (mode !== 'drawn' || !canvasRef.current) return
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = 120
    canvas.width = w * ratio
    canvas.height = h * ratio
    const ctx = canvas.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.strokeStyle = '#101828'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'

    const pos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect()
      const p = 'touches' in e ? e.touches[0] : e
      return { x: p.clientX - r.left, y: p.clientY - r.top }
    }
    const start = (e: any) => { drawingRef.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault() }
    const move = (e: any) => { if (!drawingRef.current) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true); e.preventDefault() }
    const end = () => { drawingRef.current = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [mode])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  async function handleSign() {
    if (!record || !signerName.trim()) return
    setSubmitting(true)
    const signature_data = mode === 'typed' ? typedSig.trim() : canvasRef.current?.toDataURL() || ''
    const res = await fetch('/api/lease-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, role, method: mode, signature_data, signer_name: signerName.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.error) { setError(data.error); return }
    setSignedResult({ signed_at: data.signed_at, document_hash: data.document_hash })
  }

  const canSign = mode === 'typed' ? typedSig.trim().length > 1 : hasDrawn
  const alreadySignedByRole = record && (role === 'tenant' ? record.tenant_signed_at : record.landlord_signed_at)

  const tenantName = kind === 'pm_lease' ? record?.pm_tenants?.name : record?.estate_tenants?.name
  const propertyName = kind === 'pm_lease' ? record?.pm_properties?.name : record?.estate_properties?.name
  const unitLabel = kind === 'pm_lease' ? record?.pm_units?.unit_number : undefined
  const rentAmount = kind === 'pm_lease' ? record?.monthly_rent : record?.rent
  const docTitle = kind === 'estate_tenancy' ? 'Estate Agency Tenancy Agreement' : 'Tenancy Agreement'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap" rel="stylesheet" />

      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '18px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: '#101828', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>O</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#101828' }}>Opero</div>
          <div style={{ fontSize: 13, color: '#667085', marginLeft: 6 }}>Document Signing</div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 80px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 80, color: '#98A2B3' }}>Loading document…</div>}

        {!loading && error && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #FEE2E2', padding: 40, textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: '#DC2626', marginBottom: 6 }}>Unable to load this document</div>
            <div style={{ fontSize: 13, color: '#667085' }}>{error}</div>
          </div>
        )}

        {!loading && !error && record && !signedResult && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4E7EC', padding: '36px 40px' }}>
            <h1 style={{ fontSize: 19, margin: '0 0 4px', color: '#101828' }}>{docTitle}</h1>
            <div style={{ fontSize: 13, color: '#667085', marginBottom: 24 }}>
              {propertyName}{unitLabel ? ` · Unit ${unitLabel}` : ''}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24, fontSize: 13 }}>
              <div><div style={{ color: '#98A2B3', fontSize: 11, textTransform: 'uppercase', marginBottom: 3 }}>Tenant</div><div style={{ color: '#101828', fontWeight: 500 }}>{tenantName ?? '—'}</div></div>
              <div><div style={{ color: '#98A2B3', fontSize: 11, textTransform: 'uppercase', marginBottom: 3 }}>Term</div><div style={{ color: '#101828', fontWeight: 500 }}>{record.start_date ?? '—'} → {record.end_date ?? '—'}</div></div>
              <div><div style={{ color: '#98A2B3', fontSize: 11, textTransform: 'uppercase', marginBottom: 3 }}>Monthly Rent</div><div style={{ color: '#101828', fontWeight: 500 }}>£{(rentAmount ?? 0).toLocaleString()}</div></div>
              <div><div style={{ color: '#98A2B3', fontSize: 11, textTransform: 'uppercase', marginBottom: 3 }}>Deposit</div><div style={{ color: '#101828', fontWeight: 500 }}>£{(record.deposit ?? 0).toLocaleString()}</div></div>
            </div>

            {record.document_url && (
              <a href={record.document_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>View full lease document →</a>
            )}

            <div style={{ marginTop: 28, borderTop: '1px solid #E4E7EC', paddingTop: 24 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['tenant', 'landlord'] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    border: role === r ? 'none' : '1px solid #E4E7EC',
                    background: role === r ? '#101828' : '#fff', color: role === r ? '#fff' : '#667085', textTransform: 'capitalize',
                  }}>Sign as {r}</button>
                ))}
              </div>

              {alreadySignedByRole ? (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 16, fontSize: 13, color: '#166534' }}>
                  This document has already been signed as {role}.
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#344054', marginBottom: 6 }}>Full Name *</label>
                  <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Your full legal name" style={inp} />

                  <div style={{ display: 'flex', gap: 6, margin: '16px 0 12px' }}>
                    <button onClick={() => setMode('typed')} style={toggleBtn(mode === 'typed')}>Type</button>
                    <button onClick={() => setMode('drawn')} style={toggleBtn(mode === 'drawn')}>Draw</button>
                  </div>

                  {mode === 'typed' ? (
                    <input value={typedSig} onChange={e => setTypedSig(e.target.value)} placeholder="Type your signature"
                      style={{ ...inp, fontFamily: "'Caveat', cursive", fontSize: 30, padding: '10px 16px' }} />
                  ) : (
                    <div>
                      <div style={{ background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, position: 'relative' }}>
                        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 120, cursor: 'crosshair', touchAction: 'none' }} />
                        {!hasDrawn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: '#CBD5E1', pointerEvents: 'none' }}>Draw your signature</div>}
                      </div>
                      <button onClick={clearCanvas} style={{ fontSize: 11.5, color: '#667085', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0, textDecoration: 'underline' }}>Clear</button>
                    </div>
                  )}

                  <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 16, lineHeight: 1.5 }}>
                    By signing, I confirm I have read this agreement and consent to sign it electronically.
                  </div>

                  <button onClick={handleSign} disabled={!canSign || !signerName.trim() || submitting}
                    style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#101828', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (!canSign || !signerName.trim() || submitting) ? 0.5 : 1 }}>
                    {submitting ? 'Signing…' : 'Sign Document'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {signedResult && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #BBF7D0', padding: 40, textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, color: '#16A34A' }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#101828', marginBottom: 6 }}>Document signed</div>
            <div style={{ fontSize: 13, color: '#667085', marginBottom: 16 }}>Signed {new Date(signedResult.signed_at).toLocaleString()}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: '#98A2B3', wordBreak: 'break-all', background: '#F9FAFB', borderRadius: 6, padding: '10px 14px' }}>{signedResult.document_hash}</div>
          </div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const toggleBtn = (active: boolean): React.CSSProperties => ({
  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: active ? '#fff' : '#667085',
  background: active ? '#101828' : '#fff', border: '1px solid ' + (active ? '#101828' : '#E4E7EC'), borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
})
