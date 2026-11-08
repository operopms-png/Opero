'use client'
export const dynamic = 'force-dynamic'
// The page a client opens from their secure link: contracts to sign, documents to upload, invoices to pay. No login.
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PortalDocuments from '@/components/portal/PortalDocuments'
import UtilityTracker from '@/components/pm/UtilityTracker'

const BLUE = '#2F6DB5'
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }
const lab: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', margin: '18px 2px 8px' }
const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: bg, color: fg, whiteSpace: 'nowrap' })
const btn: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'center', marginTop: 10, border: 'none', borderRadius: 8, background: BLUE, color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }
const money = (n: any, c: string) => { try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c || 'GBP' }).format(Number(n)) } catch { return `${c} ${Number(n).toFixed(2)}` } }
const day = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function ClientLinkPage() {
  const { token } = useParams() as { token: string }
  const [justPaid, setJustPaid] = useState(false)
  useEffect(() => { setJustPaid(new URLSearchParams(window.location.search).get('paid') === '1') }, [])
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    const r = await fetch('/api/public/client-link?t=' + encodeURIComponent(token)); const j = await r.json().catch(() => ({}))
    if (!r.ok) setErr(j.error || 'This link is not valid.'); else setD(j)
  }, [token])
  useEffect(() => { load() }, [load])
  // after a card payment the confirmation can take a few seconds to arrive
  useEffect(() => { if (!justPaid) return; const t = setInterval(load, 4000); const stop = setTimeout(() => clearInterval(t), 30000); return () => { clearInterval(t); clearTimeout(stop) } }, [justPaid, load])

  async function pay(id: string) {
    setBusy(id); setMsg('')
    const r = await fetch('/api/public/client-link/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, invoice_id: id }) }); const j = await r.json().catch(() => ({}))
    setBusy(''); if (r.ok && j.url) window.location.href = j.url; else setMsg(j.error || 'Could not start the payment.')
  }

  const wrap: React.CSSProperties = { minHeight: '100vh', background: '#F4F7FB', fontFamily: 'Figtree, Segoe UI, Arial, sans-serif', color: '#1B2A4A', padding: '0 0 40px' }
  if (err) return <div style={wrap}><div style={{ maxWidth: 440, margin: '80px auto', background: '#fff', borderRadius: 12, padding: 28, textAlign: 'center', border: '1px solid #E4E7EC' }}>{err}</div></div>
  if (!d) return <div style={{ ...wrap, textAlign: 'center', paddingTop: 80, color: '#98A2B3' }}>Loading…</div>
  const tenant = d.subject === 'tenant' || d.subject === 'ea_tenant'
  const toSign = d.signs.filter((s: any) => !s.signed), signed = d.signs.filter((s: any) => s.signed)
  const due = d.invoices.filter((i: any) => i.status !== 'paid'), paid = d.invoices.filter((i: any) => i.status === 'paid')

  return (
    <div style={wrap}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '14px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE }}>{d.company}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Your documents</div>
          <div style={{ fontSize: 12.5, color: '#667085' }}>{d.person.name} · {tenant ? 'Tenant' : 'Owner'}</div>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '4px 16px' }}>
        {justPaid && <div style={{ ...card, marginTop: 14, background: '#E7F6EC', borderColor: '#B7E4C7', color: '#067647', fontWeight: 600, fontSize: 13.5 }}>Thank you. Your payment is being confirmed and a receipt will be emailed to you.</div>}
        {msg && <div style={{ ...card, marginTop: 14, background: '#FEF3F2', borderColor: '#FDA29B', color: '#B42318', fontSize: 13.5 }}>{msg}</div>}

        {toSign.length > 0 && <>
          <div style={lab}>To sign</div>
          {toSign.map((s: any) => <div key={s.token} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}><div><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 12, color: '#667085' }}>Read it, initial each section and sign</div></div><span style={pill('#FFF4E0', '#B54708')}>Sign</span></div>
            <a href={`/sign/${s.token}`} style={btn}>Review and sign</a>
          </div>)}
        </>}

        {due.length > 0 && <>
          <div style={lab}>{tenant ? 'To pay' : 'Invoices to pay'}</div>
          {due.map((i: any) => <div key={i.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div><div style={{ fontWeight: 600 }}>Invoice {i.number}</div><div style={{ fontSize: 12, color: '#667085' }}>{i.due_date ? `Due ${day(i.due_date)}` : `Issued ${day(i.issue_date)}`} · <a href={`/invoice/${i.token}`} target="_blank" rel="noreferrer" style={{ color: BLUE }}>View invoice</a></div></div>
              <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(i.total, i.currency)}</div>
            </div>
            <button style={{ ...btn, opacity: busy === i.id ? .6 : 1 }} disabled={!!busy} onClick={() => pay(i.id)}>{busy === i.id ? 'Opening payment…' : 'Pay now by card'}</button>
          </div>)}
        </>}

        {(d.subject === 'landlord' || d.subject === 'tenant') && <div style={{ marginTop: 18 }}><UtilityTracker kind={d.subject} link={token} hideEmpty /></div>}

        <div style={lab}>Documents</div>
        <PortalDocuments kind={d.subject} link={token} />

        {(signed.length > 0 || paid.length > 0) && <>
          <div style={lab}>Done</div>
          {signed.map((s: any) => <div key={s.token} style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 12, color: '#667085' }}>Signed {day(s.signed_at)}</div></div><span style={pill('#E7F6EC', '#067647')}>Signed</span></div></div>)}
          {paid.map((i: any) => <div key={i.id} style={card}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><div style={{ fontWeight: 600 }}>Invoice {i.number}</div><div style={{ fontSize: 12, color: '#667085' }}>Paid {day(i.paid_at)} · {money(i.total, i.currency)}</div></div><span style={pill('#E7F6EC', '#067647')}>Paid</span></div></div>)}
        </>}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#98A2B3', marginTop: 24 }}>Private link for {d.person.name}. Valid until {day(d.expires_at)}. Please do not forward it.</div>
      </div>
    </div>
  )
}
