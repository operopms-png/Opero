'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND } from '@/lib/crm-board'
import { Modal } from '@/components/crm/Popover'
import type { Mk } from '@/components/marketing/useMarketing'
import { generateMessage } from '@/lib/marketing-message'

// Marketing → Emails → Mailing list: how many contacts have opted in, send a saved email to them (all, or one
// type), and the code to put a sign-up form on this company's own website.
const btn: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 4, border: `1px solid ${BRAND.border}`, background: '#fff', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: BRAND.ink }
const gold: React.CSSProperties = { ...btn, border: 'none', background: BRAND.goldDark, color: '#fff', fontWeight: 600 }
const field: React.CSSProperties = { width: '100%', height: 36, border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: '0 10px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }
const lbl: React.CSSProperties = { fontSize: 12.5, color: BRAND.muted, display: 'block', marginBottom: 4 }

export default function MailingListModal({ mk, onClose }: { mk: Mk; onClose: () => void }) {
  const [counts, setCounts] = useState<{ total: number; types: Record<string, number>; people: { name: string; email: string; type: string; source: string | null; at: string | null }[]; docs: { id: string; title: string; pictures: number }[] } | null>(null)
  const [aud, setAud] = useState('all')
  const [emailId, setEmailId] = useState('')
  const [subject, setSubject] = useState(''), [body, setBody] = useState('')
  const [mode, setMode] = useState<'both' | 'picture' | 'link'>('both'), [docIds, setDocIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [showList, setShowList] = useState(false)
  const drafts = mk.rows.emails.filter((e: any) => e.status !== 'Sent' && e.body?.trim())
  const embed = `<script src="https://app.thenovourq.com/join-form.js" data-business="${mk.accountId}" data-title="Join our mailing list"></script>`

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? ''
  useEffect(() => { (async () => {
    const r = await fetch('/api/marketing-list', { headers: { Authorization: `Bearer ${await token()}` } })
    if (r.ok) setCounts(await r.json())
  })() }, [])

  const n = counts ? (aud === 'all' ? counts.total : counts.types[aud] ?? 0) : 0
  const draft = drafts.find((x: any) => x.id === emailId)
  const pickDraft = (id: string) => { setEmailId(id); const d = drafts.find((x: any) => x.id === id); if (d) { setSubject(d.subject || ''); setBody(d.body || '') } }
  const generate = () => { const g = generateMessage(); setEmailId(''); setSubject(g.subject); setBody(g.text) }
  const toggleDoc = (id: string) => setDocIds(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id])
  const send = async () => {
    if (!subject.trim() || !body.trim()) { setMsg('Add a subject and write the message first.'); return }
    if (!n) { setMsg('Nobody in that audience has opted in.'); return }
    if (!confirm(`Send "${subject}" to ${n} opted-in ${n === 1 ? 'person' : 'people'} now? Each email carries an unsubscribe link. This cannot be undone.`)) return
    setBusy(true); setMsg('')
    const r = await fetch('/api/marketing-list', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ email_id: draft && draft.subject === subject && (draft.body || '') === body ? emailId : undefined, subject, body, audience: aud, doc_ids: docIds, mode }) })
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

        {counts && counts.total > 0 && <div style={{ marginBottom: 18 }}>
          <button style={btn} onClick={() => setShowList(!showList)}>{showList ? 'Hide who is on the list' : 'See who is on the list'}</button>
          {showList && <div style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto', border: `1px solid ${BRAND.border}`, borderRadius: 6 }}>
            {counts.people.map((p, i) => <div key={i} style={{ padding: '8px 12px', fontSize: 13, borderBottom: `1px solid ${BRAND.border}`, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span><b style={{ fontWeight: 600 }}>{p.name}</b><br /><span style={{ color: BRAND.muted }}>{p.email}</span></span>
              <span style={{ color: BRAND.muted, textAlign: 'right', fontSize: 12 }}>{p.source || ''}<br />{p.at ? new Date(p.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
            </div>)}
          </div>}
        </div>}

        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Send a message to the list</h3>
        <label style={lbl}>Audience</label>
        <select value={aud} onChange={e => setAud(e.target.value)} style={field}>
          <option value="all">Everyone opted in{counts ? ` (${counts.total})` : ''}</option>
          {counts && Object.entries(counts.types).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={btn} onClick={generate}>Generate NOVOURQ message</button>
          {drafts.length > 0 && <select value={emailId} onChange={e => pickDraft(e.target.value)} style={{ ...field, width: 'auto', flex: 1, minWidth: 180, marginBottom: 0 }}>
            <option value="">Or use a saved draft…</option>
            {drafts.map((e: any) => <option key={e.id} value={e.id}>{e.subject}</option>)}
          </select>}
        </div>
        <label style={lbl}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={field} />
        <label style={lbl}>Message <span style={{ color: '#9699A6' }}>({'{{first_name}}'} becomes each person’s first name)</span></label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={9} placeholder="Press Generate NOVOURQ message, or write your own." style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BRAND.border}`, borderRadius: 4, padding: 10, fontFamily: 'inherit', fontSize: 14, marginBottom: 12, resize: 'vertical' }} />

        <label style={lbl}>Documents to include (from Services Pack)</label>
        <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 6, marginBottom: 12, maxHeight: 170, overflowY: 'auto' }}>
          {(counts?.docs ?? []).length === 0 && <div style={{ padding: 10, fontSize: 13, color: BRAND.muted }}>No documents yet. Add them under Marketing → Services Pack.</div>}
          {(counts?.docs ?? []).map(d => (
            <label key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', fontSize: 13.5, borderBottom: `1px solid ${BRAND.border}`, cursor: 'pointer', margin: 0, color: BRAND.ink }}>
              <input type="checkbox" checked={docIds.includes(d.id)} onChange={() => toggleDoc(d.id)} />
              <span style={{ flex: 1 }}>{d.title}</span>
              <span style={{ fontSize: 11.5, color: BRAND.muted }}>{d.pictures ? `${d.pictures} ${d.pictures === 1 ? 'picture' : 'pictures'}` : 'PDF link only'}</span>
            </label>
          ))}
        </div>
        {docIds.length > 0 && <>
          <label style={lbl}>Send documents as</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)} style={field}>
            <option value="both">Pictures in the email, plus a PDF button (recommended)</option>
            <option value="picture">Pictures only</option>
            <option value="link">PDF button only</option>
          </select>
          <p style={{ fontSize: 12, color: BRAND.muted, margin: '-6px 0 12px' }}>Pictures show the pages in the email itself, so people see them without opening a PDF. Documents with no pictures are sent as a PDF button.</p>
        </>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={busy || !n} onClick={send} style={{ ...gold, opacity: busy || !n ? 0.6 : 1 }}>{busy ? 'Sending…' : `Send to ${n}`}</button>
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
