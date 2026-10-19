'use client'
// Staff Centre → Documents → Templates.
// The documents staff send, written once with blanks ({tenant name}, {rent}…) that fill
// themselves in. Admins choose who can change what: Locked (blanks only), Editable with
// approval (wording changes go to an admin first) or Editable.
import React, { useEffect, useMemo, useState } from 'react'
import { C, CrmPage, CrmHeader, Body, Loading, Empty, btn, input, label } from '../../../../components/crm/Page'
import { staffApi } from '../../../../lib/staff-api'
import DocEditor from '../../../../components/documents/DocEditor'
import { blanksIn, blankLabel } from '../../../../lib/doc-text'

const LOCKS = [
  { k: 'locked', l: 'Locked', d: 'Staff can only fill in the blanks.' },
  { k: 'approval', l: 'Editable with approval', d: 'Staff can edit; any wording change goes to an admin first.' },
  { k: 'editable', l: 'Editable', d: 'Staff can change anything and send straight away.' },
]
const AUD: Record<string, string> = { tenant: 'Tenants', owner: 'Owners', guest: 'Guests', partner: 'Partners', client: 'Clients', any: 'Anyone' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 8, padding: 16 }

export default function Templates() {
  const [view, setView] = useState<string | null>(null)
  useEffect(() => {
    const read = () => { const sp = new URLSearchParams(window.location.search); setView(sp.get('id') || (sp.get('new') ? 'new' : null)) }
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read)
  }, [])
  const go = (v: string | null) => { window.history.pushState(null, '', v === 'new' ? '?new=1' : v ? `?id=${v}` : window.location.pathname); setView(v); window.scrollTo(0, 0) }
  return view ? <Editor id={view === 'new' ? null : view} back={() => go(null)} onSaved={id => go(id)} /> : <List open={go} />
}

function List({ open }: { open: (v: string) => void }) {
  const [d, setD] = useState<any>(null), [err, setErr] = useState(''), [q, setQ] = useState('')
  useEffect(() => { staffApi('/api/documents?templates=1').then(setD).catch(e => setErr(e.message)) }, [])
  const list: any[] = (d?.templates || []).filter((t: any) => !q || (t.name + ' ' + t.category).toLowerCase().includes(q.toLowerCase()))
  const cats = [...new Set(list.map(t => t.category))]
  return (
    <CrmPage>
      <CrmHeader title="Templates" subtitle="Write a document once with blanks — staff pick a person and the blanks fill themselves in."
        actions={d?.isAdmin && <button style={btn('gold')} onClick={() => open('new')}>+ New template</button>} />
      <Body>
        {err && <div style={{ color: C.red }}>{err}</div>}
        {!d ? (!err && <Loading />) : <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates" style={{ ...input, maxWidth: 320, marginBottom: 14 }} />
          {list.length === 0 ? <Empty>No templates yet.{d.isAdmin ? <> Press <b>New template</b> — paste your wording or upload a Word file.</> : ' An admin adds them.'}</Empty> :
            cats.map(cat => <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: C.goldDark, textTransform: 'uppercase', marginBottom: 8 }}>{cat}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 12 }}>
                {list.filter(t => t.category === cat).map(t => <button key={t.id} onClick={() => open(t.id)} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', opacity: t.active ? 1 : .55 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 14.5, color: C.ink }}>{t.name}</b>{!t.active && <span style={{ fontSize: 11, color: C.muted }}>Hidden</span>}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>For {AUD[t.audience] || 'anyone'} · {t.needs_signature ? 'Needs signature' : 'No signature'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: t.lock_mode === 'locked' ? '#F2F2F2' : t.lock_mode === 'approval' ? '#FFF4E0' : '#E6F7EF', color: t.lock_mode === 'locked' ? '#5C5850' : t.lock_mode === 'approval' ? '#A15C00' : '#0E7C55' }}>{LOCKS.find(l => l.k === t.lock_mode)?.l}</span>
                    <span style={{ fontSize: 11, color: C.muted, padding: '2px 0' }}>Used {t.uses}×</span>
                  </div>
                </button>)}
              </div>
            </div>)}
        </>}
      </Body>
    </CrmPage>
  )
}

const BLANK_TPL = { name: '', category: 'Agreements', audience: 'any', body: '<h1>Title of the document</h1><p>This agreement is between {recipient_name} and {company_name} for the property at {property_address}.</p>', defaults: {}, lock_mode: 'approval', needs_signature: true, remind_days: 3, email_subject: '', email_message: '', active: true }

function Editor({ id, back, onSaved }: { id: string | null; back: () => void; onSaved: (id: string) => void }) {
  const [t, setT] = useState<any>(null), [isAdmin, setIsAdmin] = useState(false), [body, setBody] = useState(''), [k, setK] = useState(0), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [importing, setImporting] = useState(false)
  useEffect(() => {
    if (!id) { staffApi('/api/documents?templates=1').then(r => setIsAdmin(r.isAdmin)).catch(() => {}); setT({ ...BLANK_TPL }); setBody(BLANK_TPL.body); setK(1); return }
    staffApi('/api/documents?template=' + id).then(r => { setT(r.template); setBody(r.template.body); setIsAdmin(r.isAdmin); setK(x => x + 1) }).catch(e => setErr(e.message))
  }, [id])
  const blanks = useMemo(() => blanksIn(body), [body])
  if (!t) return <CrmPage><Body>{err ? <div style={{ color: C.red }}>{err}</div> : <Loading />}</Body></CrmPage>
  const set = (key: string, v: any) => setT((x: any) => ({ ...x, [key]: v }))
  async function save() {
    setErr(''); setMsg(''); setBusy(true)
    try { const r = await staffApi('/api/documents', { action: 'template-save', ...t, id: id || undefined, body }); setMsg('Saved.'); if (!id) onSaved(r.template.id); else setT(r.template) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  async function importWord(file?: File) {
    if (!file) return
    setErr(''); setImporting(true)
    try {
      const b64 = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = rej; fr.readAsDataURL(file) })
      const r = await staffApi('/api/documents', { action: 'template-import', filename: file.name, content: b64 })
      if (!t.name) set('name', file.name.replace(/\.docx$/i, ''))
      setBody(r.body); setK(x => x + 1); setMsg('Imported. Replace the gaps (________) with blanks: put the cursor there and press “Insert blank”.')
    } catch (e: any) { setErr(e.message) } finally { setImporting(false) }
  }
  return (
    <CrmPage>
      <Body>
        <style>{`@media(max-width:1100px){.tpl-grid{grid-template-columns:1fr!important}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button style={btn('ghost', true)} onClick={back}>← Templates</button>
          {isAdmin ? <input value={t.name} onChange={e => set('name', e.target.value)} placeholder="Template name" style={{ ...input, fontSize: 18, fontWeight: 700, maxWidth: 440 }} /> : <b style={{ fontSize: 20 }}>{t.name}</b>}
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: t.active ? '#E6F7EF' : '#F2F2F2', color: t.active ? '#0E7C55' : '#8A877F' }}>{t.active ? 'Live' : 'Hidden'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {isAdmin && <label style={{ ...btn('ghost'), cursor: 'pointer' }}>{importing ? 'Reading…' : 'Upload Word file'}<input type="file" accept=".docx" hidden onChange={e => importWord(e.target.files?.[0])} /></label>}
            {isAdmin && <button style={btn('gold')} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save template'}</button>}
          </div>
        </div>
        {err && <div style={{ color: C.red, margin: '10px 0' }}>{err}</div>}
        {msg && <div style={{ background: '#E6F7EF', color: '#0E7C55', padding: '9px 14px', borderRadius: 6, margin: '10px 0', fontSize: 13.5, fontWeight: 600 }}>{msg}</div>}
        {!isAdmin && <div style={{ fontSize: 13, color: C.muted, margin: '10px 0' }}>Only admins can change templates. To send this one, go to Documents → Send a document.</div>}
        <div className="tpl-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, marginTop: 14, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}><DocEditor html={body} resetKey={k} mode="template" readOnly={!isAdmin} onChange={setBody} /></div>
          <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 14, minWidth: 0 }}>
            <div style={card}>
              <b style={{ fontSize: 14 }}>Who can change what</b>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{LOCKS.map(l => <label key={l.k} style={{ display: 'flex', gap: 10, padding: '9px 11px', border: '1px solid ' + (t.lock_mode === l.k ? C.goldDark : C.border), background: t.lock_mode === l.k ? '#FBF6EA' : '#fff', borderRadius: 6, cursor: 'pointer' }}>
                <input type="radio" checked={t.lock_mode === l.k} onChange={() => set('lock_mode', l.k)} style={{ marginTop: 3 }} />
                <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.l}</div><div style={{ fontSize: 12, color: C.muted }}>{l.d}</div></div></label>)}</div>
            </div>
            <div style={card}>
              <b style={{ fontSize: 14 }}>Blanks in this template</b>
              <div style={{ fontSize: 12, color: C.muted, margin: '2px 0 8px' }}>Filled in from the person and property. Give a default for anything that’s always the same.</div>
              {blanks.length === 0 ? <div style={{ fontSize: 12.5, color: C.muted }}>None yet — use “Insert blank”.</div> :
                <div style={{ display: 'grid', gap: 6 }}>{blanks.map(b => <div key={b.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5 }}>{blankLabel(b.key)}{b.options ? <span style={{ color: C.muted }}> · choice</span> : ''}</span>
                  {b.options ? <span style={{ fontSize: 11.5, color: C.muted }}>{b.options.join(' / ')}</span> : <input style={{ ...input, padding: '5px 8px', fontSize: 12.5 }} placeholder="Default (optional)" value={t.defaults?.[b.key] || ''} onChange={e => set('defaults', { ...(t.defaults || {}), [b.key]: e.target.value })} />}
                </div>)}</div>}
            </div>
            <div style={card}>
              <b style={{ fontSize: 14 }}>Sending</b>
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={label}>Category</label><input style={input} value={t.category} onChange={e => set('category', e.target.value)} list="doc-cats" /><datalist id="doc-cats">{['Agreements', 'Tenancy', 'Notices', 'Letters', 'Guests', 'Partners', 'Forms'].map(c => <option key={c} value={c} />)}</datalist></div>
                  <div><label style={label}>Used for</label><select style={input} value={t.audience} onChange={e => set('audience', e.target.value)}>{Object.entries(AUD).map(([kk, v]) => <option key={kk} value={kk}>{v}</option>)}</select></div>
                </div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={t.needs_signature} onChange={e => set('needs_signature', e.target.checked)} /> Needs their signature</label>
                {t.needs_signature && <div><label style={label}>Remind if not signed after</label><select style={input} value={t.remind_days} onChange={e => set('remind_days', Number(e.target.value))}>{[[0, 'Never'], [2, '2 days'], [3, '3 days'], [5, '5 days'], [7, '7 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
                <div><label style={label}>Email subject</label><input style={input} value={t.email_subject || ''} onChange={e => set('email_subject', e.target.value)} placeholder={t.name || 'Uses the template name'} /></div>
                <div><label style={label}>Email message</label><textarea style={{ ...input, resize: 'vertical' }} rows={3} value={t.email_message || ''} onChange={e => set('email_message', e.target.value)} placeholder="Leave empty for a standard message" /></div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={t.active} onChange={e => set('active', e.target.checked)} /> Live — staff can send it</label>
                {t.source_url && <a href={t.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: C.goldDark, fontWeight: 600 }}>Open the original file</a>}
                {id && isAdmin && <button type="button" style={btn('danger', true)} onClick={async () => { if (confirm('Delete this template? Documents already sent are kept.')) { await staffApi('/api/documents', { action: 'template-delete', id }); back() } }}>Delete template</button>}
              </div>
            </div>
          </fieldset>
        </div>
      </Body>
    </CrmPage>
  )
}
