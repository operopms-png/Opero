'use client'
// Staff Centre → Documents → Sent.
// Every document sent to tenants, guests, owners and partners, and where it's up to.
// "Send a document": pick a template and a person — the blanks fill themselves in —
// edit, and send. On an "Editable with approval" template, changed wording goes to
// Finance → Approvals first and sends itself once approved.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Stat, Loading, Empty, Modal, btn, input, label } from '../../../components/crm/Page'
import { staffApi } from '../../../lib/staff-api'
import DocEditor, { DOC_CSS } from '../../../components/documents/DocEditor'
import { DOC_STATUS, KIND_LABEL, downloadDocPdf, PersonSearch } from '../../../components/documents/shared'
import { wordingText, changeSummary, emptyBlanks, blankLabel, settleBlanks } from '../../../lib/doc-text'

const when = (d?: string | null) => { if (!d) return '—'; const x = new Date(d), t = new Date(); const same = x.toDateString() === t.toDateString(); return same ? 'Today ' + x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16 }


export default function Documents() {
  const [view, setView] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  useEffect(() => {
    const read = () => { const sp = new URLSearchParams(window.location.search); setView(sp.get('id')); setIsNew(!!sp.get('new')) }
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read)
  }, [])
  const go = (id: string | null) => { window.history.pushState(null, '', id ? `?id=${id}` : window.location.pathname); setView(id); setIsNew(false); window.scrollTo(0, 0) }
  return view ? <DocView id={view} back={() => go(null)} /> : <List open={go} startNew={isNew} />
}

// ── list ────────────────────────────────────────────────────────────────
function List({ open, startNew }: { open: (id: string) => void; startNew: boolean }) {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [tab, setTab] = useState('all'), [q, setQ] = useState(''), [newDoc, setNewDoc] = useState(startNew)
  useEffect(() => { staffApi('/api/documents').then(setD).catch(e => setErr(e.message)) }, [])
  useEffect(() => { if (startNew) setNewDoc(true) }, [startNew])
  const all: any[] = d?.docs || []
  const match = (x: any) => tab === 'all' || (tab === 'waiting' ? x.needs_signature && ['sent', 'opened'].includes(x.status) : tab === 'approval' ? x.status === 'pending_approval' : tab === 'drafts' ? ['draft', 'rejected'].includes(x.status) : x.status === tab)
  const shown = all.filter(x => match(x) && (!q || [x.title, x.recipient_name, x.recipient_email, x.property_label].join(' ').toLowerCase().includes(q.toLowerCase())))
  const count = (t: string) => all.filter(x => { const k = tab; void k; return t === 'waiting' ? x.needs_signature && ['sent', 'opened'].includes(x.status) : t === 'approval' ? x.status === 'pending_approval' : t === 'drafts' ? ['draft', 'rejected'].includes(x.status) : x.status === t }).length
  return (
    <CrmPage>
      <CrmHeader title="Documents" subtitle="Everything sent to tenants, guests, owners and partners — and where it’s up to."
        actions={<button style={btn('gold')} onClick={() => setNewDoc(true)}>Send a document</button>}
        tabs={[{ k: 'all', l: 'All', count: all.length }, { k: 'waiting', l: 'Waiting', count: count('waiting') }, { k: 'signed', l: 'Signed', count: count('signed') }, { k: 'approval', l: 'Awaiting approval', count: count('approval') }, { k: 'drafts', l: 'Drafts', count: count('drafts') }]} tab={tab} onTab={setTab} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="Waiting for signature" value={d.stats.waiting} />
            <Stat label="Awaiting approval" value={<span style={{ color: d.stats.approval ? '#A15C00' : C.ink }}>{d.stats.approval}</span>} />
            <Stat label="Signed this month" value={<span style={{ color: '#0E7C55' }}>{d.stats.signedMonth}</span>} highlight />
            <Stat label="Sent automatically" value={d.stats.automatic} />
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, property or document" style={{ ...input, maxWidth: 320, marginBottom: 14 }} />
          {shown.length === 0 ? <Empty>{all.length === 0 ? <>Nothing sent yet. Press <b>Send a document</b>, pick a template and who it’s for — their details fill in by themselves.</> : 'Nothing matches.'}</Empty> : (
            <div style={{ background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 820 }}>
                <thead><tr style={{ background: '#F7F8FA' }}>{['Document', 'Sent to', 'By', 'When', 'Status', ''].map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>)}</tr></thead>
                <tbody>{shown.map(x => { const st = DOC_STATUS[x.status] || DOC_STATUS.draft; return (
                  <tr key={x.id} style={{ borderTop: '1px solid #F0F1F4', cursor: 'pointer' }} onClick={() => open(x.id)}>
                    <td style={td}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><FileIcon /><div><div style={{ fontWeight: 700 }}>{x.title}</div><div style={{ fontSize: 11.5, color: C.muted }}>{x.rule_id ? 'Sent automatically' : x.changed ? 'Wording changed' : x.needs_signature ? 'Needs signature' : 'For information'}</div></div></div></td>
                    <td style={td}><div style={{ fontWeight: 600 }}>{x.recipient_name}</div><div style={{ fontSize: 11.5, color: C.muted }}>{[KIND_LABEL[x.person_kind], x.property_label].filter(Boolean).join(' · ')}</div></td>
                    <td style={td}>{x.created_by}</td>
                    <td style={td}>{when(x.signed_at || x.sent_at || x.created_at)}</td>
                    <td style={td}><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: st.bg, color: st.c, whiteSpace: 'nowrap' }}>{st.l}{x.reminders && ['sent', 'opened'].includes(x.status) ? ` · reminded ${x.reminders}×` : ''}</span></td>
                    <td style={{ ...td, textAlign: 'right' }}><button style={btn('ghost', true)}>{x.status === 'pending_approval' && d.isAdmin ? 'Review' : ['draft', 'rejected'].includes(x.status) ? 'Edit' : 'View'}</button></td>
                  </tr>) })}</tbody>
              </table>
            </div>
          )}
        </>}
      </Body>
      {newDoc && <NewDocModal onClose={() => setNewDoc(false)} onCreated={id => open(id)} />}
    </CrmPage>
  )
}
const td: React.CSSProperties = { padding: '11px 16px', verticalAlign: 'middle' }
const FileIcon = () => <span style={{ width: 30, height: 30, borderRadius: 6, background: '#F6F1E4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A7726" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></span>

// ── new document: template + person ─────────────────────────────────────
function NewDocModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [tpls, setTpls] = useState<any[] | null>(null), [tid, setTid] = useState(''), [person, setPerson] = useState<any>(null), [manual, setManual] = useState({ name: '', email: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  useEffect(() => {
    staffApi('/api/documents?templates=1').then(r => setTpls(r.templates.filter((t: any) => t.active))).catch(e => setErr(e.message))
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('kind') && sp.get('pid')) setPerson({ kind: sp.get('kind'), id: sp.get('pid'), name: sp.get('pname') || 'Selected person', label: '' })
  }, [])
  async function go() {
    setErr(''); if (!tid) return setErr('Choose a template.')
    if (!person && !manual.name.trim()) return setErr('Choose who it’s for, or type their name.')
    setBusy(true)
    try { const r = await staffApi('/api/documents', { action: 'create', template_id: tid, person_kind: person?.kind, person_id: person?.id, recipient_name: manual.name, recipient_email: manual.email }); onCreated(r.doc.id) } catch (e: any) { setErr(e.message); setBusy(false) }
  }
  const cats = useMemo(() => [...new Set((tpls || []).map(t => t.category))], [tpls])
  return (
    <Modal title="Send a document" onClose={onClose} width={620}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div><label style={label}>1 · Which document?</label>
          {!tpls ? <Loading /> : tpls.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>No templates yet — an admin adds them under Documents → Templates.</div> :
            <div style={{ display: 'grid', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>{cats.map(cat => <div key={cat}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: C.goldDark, textTransform: 'uppercase', marginBottom: 5 }}>{cat}</div>
              <div style={{ display: 'grid', gap: 6 }}>{tpls.filter(t => t.category === cat).map(t => <button key={t.id} type="button" onClick={() => setTid(t.id)} style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 6, border: '1px solid ' + (tid === t.id ? C.goldDark : C.border), background: tid === t.id ? '#FBF6EA' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{t.lock_mode === 'locked' ? 'Locked — blanks only' : t.lock_mode === 'approval' ? 'Wording changes need approval' : 'Editable'} · {t.needs_signature ? 'Needs signature' : 'No signature'}</div></button>)}</div></div>)}</div>}
        </div>
        <div><label style={label}>2 · Who is it for?</label>
          {person ? <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', border: '1px solid ' + C.border, borderRadius: 6 }}><div><b style={{ fontSize: 13.5 }}>{person.name}</b><div style={{ fontSize: 11.5, color: C.muted }}>{[person.label, person.sub, person.email].filter(Boolean).join(' · ')}</div></div><button style={btn('ghost', true)} onClick={() => setPerson(null)}>Change</button></div>
            : <>
              <PersonSearch onPick={setPerson} />
              <div style={{ fontSize: 11.5, color: C.muted, margin: '8px 0 4px' }}>Not in the portal? Type their details instead:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><input style={input} placeholder="Full name" value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} /><input style={input} placeholder="Email" type="email" value={manual.email} onChange={e => setManual({ ...manual, email: e.target.value })} /></div>
            </>}
        </div>
        {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button style={btn('ghost')} onClick={onClose}>Cancel</button><button style={btn('gold')} disabled={busy} onClick={go}>{busy ? 'Filling in…' : 'Fill in and open'}</button></div>
      </div>
    </Modal>
  )
}


// ── one document: edit + send, or follow it ─────────────────────────────
function DocView({ id, back }: { id: string; back: () => void }) {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [body, setBody] = useState(''), [f, setF] = useState<any>({}), [busy, setBusy] = useState(''), [k, setK] = useState(0), [msg, setMsg] = useState('')
  const load = useCallback(() => staffApi('/api/documents?id=' + id).then(r => { setD(r); setBody(r.doc.body); setF({ recipient_name: r.doc.recipient_name, recipient_email: r.doc.recipient_email || '', email_subject: r.doc.email_subject || '', email_message: r.doc.email_message || '', needs_signature: r.doc.needs_signature }); setK(x => x + 1) }).catch(e => setErr(e.message)), [id])
  useEffect(() => { load() }, [load])
  if (!d) return <CrmPage><Body>{err ? <div style={{ color: C.red }}>{err}</div> : <Loading />}</Body></CrmPage>
  const doc = d.doc, tpl = d.template, lock = tpl?.lock_mode || 'editable'
  const editable = ['draft', 'rejected'].includes(doc.status)
  const settled = settleBlanks(body)
  const changed = !!doc.base_body && wordingText(settled) !== wordingText(doc.base_body)
  const changes = changed ? changeSummary(doc.base_body, settled) : []
  const empties = emptyBlanks(settled)
  const st = DOC_STATUS[doc.status] || DOC_STATUS.draft
  const willApprove = changed && lock === 'approval' && !d.isAdmin
  const blocked = changed && lock === 'locked' && !d.isAdmin
  const set = (key: string, v: any) => setF((x: any) => ({ ...x, [key]: v }))

  async function run(action: string, extra: any = {}) {
    setErr(''); setMsg(''); setBusy(action)
    try {
      const r = await staffApi('/api/documents', { action, id: doc.id, ...(editable && ['save', 'send'].includes(action) ? { body, ...f } : {}), ...extra })
      if (action === 'delete') return back()
      if (r.pendingApproval) setMsg('Sent to an admin for approval — it goes to ' + f.recipient_name + ' automatically once approved.')
      else if (action === 'send') setMsg('Sent to ' + f.recipient_email + '.')
      else if (action === 'remind') setMsg('Reminder sent.')
      else if (action === 'save') setMsg('Saved.')
      await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  async function decide(status: 'approved' | 'rejected') {
    setErr(''); setBusy(status)
    try { await staffApi('/api/approvals', { action: 'decide', id: doc.approval_id, status }); setMsg(status === 'approved' ? 'Approved and sent.' : 'Changes rejected — it’s back with ' + doc.created_by + '.'); await load() } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }
  const signLink = typeof window !== 'undefined' ? `${window.location.origin}/sign/${doc.token}` : ''

  return (
    <CrmPage>
      <Body>
        <style>{DOC_CSS}{`@media(max-width:1100px){.doc-grid{grid-template-columns:1fr!important}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button style={btn('ghost', true)} onClick={back}>← Documents</button>
          <b style={{ fontSize: 20, color: C.ink }}>{doc.title}</b>
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: st.bg, color: st.c }}>{st.l}</span>
          {tpl && <span style={{ fontSize: 12.5, color: C.muted }}>{lock === 'locked' ? 'Locked template' : lock === 'approval' ? 'Editable with approval' : 'Editable'}</span>}
        </div>
        {err && <div style={{ color: C.red, margin: '10px 0' }}>{err}</div>}
        {msg && <div style={{ background: '#E6F7EF', color: '#0E7C55', padding: '9px 14px', borderRadius: 6, margin: '10px 0', fontSize: 13.5, fontWeight: 600 }}>{msg}</div>}
        <div className="doc-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, marginTop: 14, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            {editable && <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', fontSize: 11.5, fontWeight: 700 }}>
              <span style={{ background: '#FBF1D3', color: '#7A5B12', padding: '3px 9px', borderRadius: 10 }}>Filled in automatically</span>
              {empties.length > 0 && <span style={{ background: '#FDECEC', color: '#B42318', padding: '3px 9px', borderRadius: 10 }}>{empties.length} blank{empties.length > 1 ? 's' : ''} still empty</span>}
              {changed && <span style={{ background: '#FFF4E0', color: '#A15C00', padding: '3px 9px', borderRadius: 10 }}>Wording changed</span>}
              <span style={{ marginLeft: 'auto', color: C.muted, fontWeight: 500 }}>{lock === 'locked' && !d.isAdmin ? 'Click a highlighted blank to fill it in' : 'Click any text to edit'}</span>
            </div>}
            <DocEditor html={doc.body} resetKey={k} mode="document" lock={d.isAdmin ? 'editable' : lock} readOnly={!editable} onChange={setBody} />
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>TO</div>
              {editable ? <div style={{ display: 'grid', gap: 8 }}>
                <input style={input} value={f.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Name" />
                <input style={input} type="email" value={f.recipient_email} onChange={e => set('recipient_email', e.target.value)} placeholder="Email address" />
              </div> : <><b style={{ fontSize: 15 }}>{doc.recipient_name}</b><div style={{ fontSize: 12.5, color: C.muted }}>{[KIND_LABEL[doc.person_kind], doc.property_label].filter(Boolean).join(' · ')}</div><div style={{ fontSize: 13, marginTop: 4 }}>{doc.recipient_email}</div></>}
            </div>

            {changes.length > 0 && <div style={{ ...card, background: '#FFFAF0', borderColor: '#F0D9A8', borderLeft: '4px solid #D9A441' }}>
              <b style={{ fontSize: 13.5, color: '#7A4B00' }}>{changes.length} wording change{changes.length > 1 ? 's' : ''}{doc.status === 'pending_approval' ? ' waiting for approval' : willApprove ? ' need approval' : ''}</b>
              <div style={{ display: 'grid', gap: 4, marginTop: 6, fontSize: 12.5, color: '#5A4320' }}>{changes.map((c, i) => <div key={i}>{c}</div>)}</div>
              {willApprove && editable && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>An admin gets a request in Finance → Approvals. It sends automatically once approved.</div>}
              {blocked && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>This template is locked — undo the wording changes to send it.</div>}
              {doc.status === 'pending_approval' && d.isAdmin && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button style={btn('gold', true)} disabled={!!busy} onClick={() => decide('approved')}>{busy === 'approved' ? 'Sending…' : 'Approve and send'}</button><button style={btn('danger', true)} disabled={!!busy} onClick={() => decide('rejected')}>Reject</button></div>}
            </div>}

            {editable && empties.length > 0 && <div style={{ ...card, fontSize: 12.5 }}>
              <b style={{ fontSize: 13.5 }}>Still empty</b>
              <div style={{ color: C.muted, margin: '2px 0 6px' }}>{f.needs_signature ? `Fill these in, or leave them for ${f.recipient_name || 'the client'} to fill in when signing.` : 'Fill these in before sending — this document isn’t signed, so blanks print as empty lines.'}</div>
              {empties.map(b => <div key={b.key}>• {blankLabel(b.key)}{b.options ? ' (choice)' : ''}</div>)}
            </div>}

            {editable ? <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>EMAIL</div>
              <input style={{ ...input, marginBottom: 8 }} value={f.email_subject} onChange={e => set('email_subject', e.target.value)} placeholder={`Subject — ${doc.title}${doc.property_label ? ' — ' + doc.property_label : ''}`} />
              <textarea style={{ ...input, resize: 'vertical' }} rows={3} value={f.email_message} onChange={e => set('email_message', e.target.value)} placeholder={`Message — leave empty for: “Please find your ${doc.title}…”`} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 10 }}><input type="checkbox" checked={!!f.needs_signature} onChange={e => set('needs_signature', e.target.checked)} /> Ask them to sign online</label>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>A PDF copy is attached{f.needs_signature ? ' and they get reminders until it’s signed' : ''}.</div>
            </div> : <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>TIMELINE</div>
              {[['Made by ' + doc.created_by, doc.created_at], doc.status === 'pending_approval' && ['Waiting for an admin to approve the wording', null], doc.sent_at && ['Sent to ' + doc.recipient_email, doc.sent_at], doc.opened_at && ['Opened', doc.opened_at], doc.last_reminder_at && [`Reminder sent (${doc.reminders})`, doc.last_reminder_at], doc.signed_at && [`Signed by ${doc.signed_name}${doc.signed_ip ? ' · IP ' + doc.signed_ip : ''}`, doc.signed_at], doc.status === 'void' && ['Cancelled', doc.updated_at]].filter(Boolean).map((r: any, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '5px 0', borderTop: i ? '1px solid #F2F2F2' : 'none' }}><span>{r[0]}</span><span style={{ color: C.muted, whiteSpace: 'nowrap' }}>{r[1] ? when(r[1]) : ''}</span></div>)}
              {Object.keys(doc.client_fields || {}).length > 0 && <div style={{ marginTop: 10, fontSize: 12.5 }}><b>They filled in</b>{Object.entries(doc.client_fields).map(([kk, v]) => <div key={kk}>{blankLabel(kk)}: {String(v)}</div>)}</div>}
            </div>}

            <div style={{ display: 'grid', gap: 8 }}>
              {editable && <>
                <button style={{ ...btn('gold'), background: '#191815', borderColor: '#191815', padding: '11px 16px' }} disabled={!!busy || blocked} onClick={() => run('send')}>{busy === 'send' ? 'Sending…' : willApprove ? 'Send for approval' : 'Send'}</button>
                <div style={{ display: 'flex', gap: 8 }}><button style={{ ...btn('ghost'), flex: 1 }} disabled={!!busy} onClick={() => run('save')}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button><button style={{ ...btn('ghost'), flex: 1 }} onClick={async () => { await run('save'); downloadDocPdf(doc.id, doc.title) }}>PDF preview</button></div>
                <button style={btn('danger', true)} onClick={() => { if (confirm('Delete this draft?')) run('delete') }}>Delete draft</button>
              </>}
              {!editable && <button style={btn('ghost')} onClick={() => downloadDocPdf(doc.id, doc.title + (doc.status === 'signed' ? ' - signed' : ''))}>Download PDF{doc.status === 'signed' ? ' (signed)' : ''}</button>}
              {['sent', 'opened'].includes(doc.status) && <>
                {doc.needs_signature && <button style={btn('gold')} disabled={!!busy} onClick={() => run('remind')}>{busy === 'remind' ? 'Sending…' : 'Send a reminder'}</button>}
                <button style={btn('ghost')} onClick={() => { navigator.clipboard?.writeText(signLink); setMsg('Link copied — you can paste it into a text or WhatsApp.') }}>Copy their link</button>
              </>}
              {!editable && doc.status !== 'void' && (doc.status !== 'signed' || d.isAdmin) && <button style={btn('danger', true)} onClick={() => { if (confirm('Cancel this document? The link will stop working.')) run('void') }}>Cancel document</button>}
            </div>
          </div>
        </div>
      </Body>
    </CrmPage>
  )
}
