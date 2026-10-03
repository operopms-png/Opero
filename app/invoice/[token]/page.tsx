'use client'
// Public invoice page — the "View invoice" link in the client's email.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import InvoiceView from '@/components/invoices/InvoiceView'

export default function PublicInvoice() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [scale, setScale] = useState(1)
  useEffect(() => {
    fetch('/api/public/invoice?t=' + encodeURIComponent(token)).then(r => r.json()).then(j => j.error ? setErr(j.error) : setD(j)).catch(() => setErr('Could not load the invoice.'))
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / 794)); fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [token])
  return (
    <div style={{ minHeight: '100vh', background: '#EFECE4', padding: '24px 12px 40px', fontFamily: 'Figtree, Arial, sans-serif' }}>
      <style>{`@media print{body{background:#fff}.no-print{display:none!important}.sheet{box-shadow:none!important;transform:none!important;margin:0!important}}`}</style>
      {err ? <div style={{ maxWidth: 480, margin: '80px auto', background: '#fff', borderRadius: 10, padding: 28, textAlign: 'center', color: '#323338' }}>{err}</div> : !d ? <div style={{ textAlign: 'center', color: '#8A877F', marginTop: 80 }}>Loading…</div> : (
        <div style={{ width: 794 * scale, margin: '0 auto' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, color: '#5A4320' }}><b>{d.settings.company_name}</b> · Invoice {d.invoice.number}{d.invoice.status === 'paid' && <span style={{ marginLeft: 8, color: '#0E7C55', fontWeight: 700 }}>Paid — thank you</span>}</div>
            <a href={`/api/public/invoice?t=${token}&pdf=1`} style={{ background: '#191815', color: '#fff', padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Download PDF</a>
          </div>
          <div className="sheet" style={{ width: 794, transform: `scale(${scale})`, transformOrigin: 'top left', marginBottom: (scale - 1) * 1123, boxShadow: '0 10px 30px rgba(0,0,0,.12)' }}>
            <InvoiceView inv={d.invoice} s={d.settings} status={d.invoice.status} />
          </div>
        </div>
      )}
    </div>
  )
}
