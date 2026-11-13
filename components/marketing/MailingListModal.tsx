'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND } from '@/lib/crm-board'
import { Modal } from '@/components/crm/Popover'
import type { Mk } from '@/components/marketing/useMarketing'

// Marketing → Emails → Mailing list: how many contacts have opted in, send a saved email to them (all, or one
// type), and the code to put a sign-up form on this company's own website.
const btn: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 4, border: `1px solid ${BRAND.border}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: BRAND.ink }
const gold: React.CSSProperties = { ...btn, border: 'none', background: BRAND.goldDark, color: '#fff', fontWeight: 600 }
const field: React.CSSProperties = { width: '100%', height: 36, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }
const lbl: React.CSSProperties = { fontSize: 12.5, color: BRAND.muted, display: 'block', marginBottom: 4 }

export default function MailingListModal({ mk, onClose }: { mk: Mk; onClose: () => void }) {
  const [counts, setCounts] = useState<{ total: number; types: Record<string, number> } | null>(null)
  const [aud, setAud] = useState('all')
  const [emailId, setEmailId] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const drafts = mk.rows.emails.filter((e: any) => e.status !== 'Sent' && e.body?.trim())
  const embed = `<script src="https://app.thenovourq.com/join-form.js" data-business="${mk.accountId}" data-title="Join our mailing list"></script>`

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? ''
  useEffect(() => { (async () => {
    const r = await fetch('/api/marketing-list', { headers: { Authorization: `Bearer ${await token()}` } })
    if (r.ok) setCounts(await r.json())
  })() }, [])

  const n = counts ? (aud === 'all' ? counts.total : counts.types[aud] ?? 0) : 0
  const send = async () => {
    const e = drafts.find((x: any) => x.id === emailId)
    if (!e) { setMsg('Choose an email first.'); return }
    if (!n) { setMsg('Nobody in that audience has opted in.'); return }
    if (!confirm(`Send "${e.subject}" to ${n} opted-in ${n === 1 ? 'person' : 'people'} now? Each email carries an unsubscribe link. This cannot be undone.`)) return
    setBusy(true); setMsg('')
    const r = await fetch('/api/marketing-list', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ email_id: emailId, audience: aud }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg(j.error || 'Could not send.'); return }
    setMsg(`Sent to ${j.sent}${j.failed ? `, ${j.failed} failed` : ''}.`)
    mk.reload()
  }

  return (
    <Modal onClose={onClose} width={560}>
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 500 }}>Mailing list</h2>
        <p style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.5, margin: '0 0 16px' }}>Only contacts who ticked the marketing box (website sign-up, popup or enquiry form) are included. People who unsubscribe are removed automatically.</p>
        <div style={{ background: '#F6F7FB', borderRadius: 8, padding: '12px 14px', marginBottom: 18, fontSize: 14 }}>
          {counts ? <><b style={{ fontSize: 20 }}>{counts.total}</b> opted in{Object.keys(counts.types).length > 0 && <span style={{ color: BRAND.muted }}> · {Object.entries(counts.types).map(([k, v]) => `${v} ${k}`).join(' · ')}</span>}</> : 'Loading…'}
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Send an email to the list</h3>
        <label style={lbl}>Email (a saved draft with a body)</label>
        <select value={emailId} onChange={e => setEmailId(e.target.value)} style={field}>
          <option value="">{drafts.length ? 'Choose an email…' : 'No drafts yet. Write one in Emails first.'}</option>
          {drafts.map((e: any) => <option key={e.id} value={e.id}>{e.subject}</option>)}
        </select>
        <label style={lbl}>Audience</label>
        <select value={aud} onChange={e => setAud(e.target.value)} style={field}>
          <option value="all">Everyone opted in{counts ? ` (${counts.total})` : ''}</option>
          {counts && Object.entries(counts.types).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={busy || !emailId || !n} onClick={send} style={{ ...gold, opacity: busy || !emailId || !n ? 0.6 : 1 }}>{busy ? 'Sending…' : `Send to ${n}`}</button>
          {msg && <span style={{ fontSize: 13, color: BRAND.ink }}>{msg}</span>}
        </div>

        <h3 style={{ margin: '24px 0 8px', fontSize: 15 }}>Sign-up form for your website</h3>
        <p style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.5, margin: '0 0 8px' }}>Paste this where the form should appear (WordPress: add a Custom HTML block). People who sign up are saved in your CRM as opted in.</p>
        <textarea readOnly value={embed} onFocus={e => e.currentTarget.select()} rows={3} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12.5 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <button style={btn} onClick={() => { navigator.clipboard?.writeText(embed).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }}>{copied ? 'Copied' : 'Copy code'}</button>
          <button style={btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  )
}
