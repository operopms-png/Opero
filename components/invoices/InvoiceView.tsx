// The Sangsters invoice as a web page — same layout as the PDF (lib/invoice-pdf.ts).
// Used for the live preview while staff fill an invoice in, and for the page
// the client opens from their email (/invoice/[token]).
import React from 'react'

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
const money = (n: number, cur: string) => (SYM[cur] ?? '') + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = (d?: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : ''
const GOLD_LBL = '#D9B860'

export default function InvoiceView({ inv, s, status }: { inv: any; s: any; status?: string }) {
  const items: any[] = inv.items || []
  const total = items.reduce((a, i) => a + (Number(i.qty) || 1) * (Number(i.amount) || 0), 0)
  const lines = (t?: string | null) => (t || '').split('\n')
  return (
    <div style={{ width: 794, minHeight: 1123, background: '#fff', padding: '56px', boxSizing: 'border-box', fontFamily: 'Helvetica, Arial, sans-serif', color: '#222', position: 'relative' }}>
      {status === 'paid' && <div style={{ position: 'absolute', top: 470, left: 70, transform: 'rotate(-10deg)', border: '4px solid #0E7C55', color: '#0E7C55', fontWeight: 800, fontSize: 40, padding: '4px 18px', letterSpacing: '.1em', opacity: .75 }}>PAID</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#C9A24A', padding: '8px 16px 8px 8px', width: 216, height: 70, boxSizing: 'border-box' }}>
          {s.logo_url && <img src={s.logo_url} alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} />}
          <div style={{ fontWeight: 700, fontSize: 12.5, color: '#2a1f0c', lineHeight: 1.35 }}>{s.logo_line1}<br /><span style={{ fontWeight: 400, fontSize: 11 }}>{s.logo_line2}</span></div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13.5, color: '#666', lineHeight: 1.33 }}>{lines(s.contact_lines).map((l, i) => <div key={i}>{l}</div>)}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '42px -21px 0', padding: '0 21px 10px', borderBottom: '1px solid #999' }}>
        <div style={{ fontWeight: 700, fontSize: 27 }}>{s.company_name}</div><div style={{ fontWeight: 700, fontSize: 29 }}>INVOICE</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, gap: 20 }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <span style={{ color: GOLD_LBL, fontSize: 12.5, paddingTop: 4 }}>BILL TO:</span>
          <div><div style={{ fontWeight: 700, fontSize: 20, textTransform: 'uppercase' }}>{inv.bill_to_name || 'Choose who to bill'}</div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 2, lineHeight: 1.35 }}>{[inv.bill_to_phone, ...lines(inv.bill_to_address)].filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '3px 12px', fontSize: 14, alignContent: 'start' }}>
          {[['NUMBER:', inv.number || 'DRAFT'], ['DATE:', date(inv.issue_date)], ['DUE DATE:', inv.due_date ? date(inv.due_date) : 'On receipt']].map(([k, v]) => <React.Fragment key={k}><span style={{ color: GOLD_LBL, fontSize: 12.5, textAlign: 'right' }}>{k}</span><span>{v}</span></React.Fragment>)}
        </div>
      </div>
      <div style={{ margin: '50px -21px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px', background: '#F8E3A3', padding: '9px 21px', fontSize: 14 }}><span>Description</span><span style={{ textAlign: 'center' }}>Quantity</span><span style={{ textAlign: 'right' }}>Amount</span></div>
        {items.length === 0 && <div style={{ padding: '14px 21px', borderBottom: '1px solid #ddd', fontSize: 14.5, color: '#aaa' }}>Add a line…</div>}
        {items.map((it, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px', padding: '11px 21px', borderBottom: '1px solid #ddd', fontSize: 14.5 }}><span style={{ whiteSpace: 'pre-wrap' }}>{it.description || ' '}</span><span style={{ textAlign: 'center' }}>{it.qty || 1}</span><span style={{ textAlign: 'right' }}>{money((Number(it.qty) || 1) * (Number(it.amount) || 0), inv.currency)}</span></div>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 64, marginTop: 34, fontSize: 14.5 }}><span>TOTAL:</span><span>{money(total, inv.currency)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 34, gap: 20 }}>
        <div style={{ fontSize: 14, lineHeight: 1.33 }}><b style={{ fontSize: 14.5 }}>Payment instructions</b>{lines(s.payment_instructions).map((l, i) => <div key={i}>{l}</div>)}<div style={{ marginTop: 14 }}>Reference: {inv.number || '—'}</div></div>
        <div style={{ background: '#1F1F1F', color: '#fff', fontWeight: 700, fontSize: 20, padding: '11px 18px', display: 'flex', gap: 30, whiteSpace: 'nowrap' }}>BALANCE DUE TODAY <span>{money(total, inv.currency)}</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <div style={{ textAlign: 'center', fontSize: 13.5, width: 186 }}>
          {s.signature_url ? <img src={s.signature_url} alt="" style={{ height: 46, objectFit: 'contain' }} /> : <div style={{ fontFamily: '"Times New Roman", serif', fontStyle: 'italic', fontSize: 31 }}>{s.signature_name}</div>}
          <div style={{ borderTop: '1px solid #444', paddingTop: 6 }}>Business signature</div>
        </div>
      </div>
      {inv.note && <div style={{ marginTop: 26, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{inv.note}</div>}
      <div style={{ marginTop: inv.note ? 14 : 34, fontSize: 13.3, color: '#888', lineHeight: 1.4 }}>{s.terms_note}</div>
    </div>
  )
}
