'use client'
// Staff Centre → Marketing → Services Pack. The documents we send to show our services (brochure, landlord pack,
// flyers), and the links that open them: one document or several, live until paused, with opens and views counted.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'
import { CrmPage, CrmHeader, Body, Empty, Loading, btn, input, label } from '@/components/crm/Page'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: 16, marginBottom: 16 }
const head: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', margin: '22px 0 10px' }
const when = (d: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not opened yet'

// Each tab shows only the documents for that audience. "pick" are ticked for you when you open the tab; the rest are there to tick if needed.
// Documents with no audience here (ones staff add) show on every tab.
const TABS: { key: 'landlord' | 'cohost' | 'tenant' | 'all'; label: string; pick: string[]; more: string[]; reg: '' | 'landlord' | 'cohost'; hint: string }[] = [
  { key: 'landlord', label: 'Landlord', reg: 'landlord', pick: ['Welcome to NOVOURQ', 'Welcome letter', 'Company brochure', 'Lease your property to us', 'Landlord portal guide', 'Shortlet landlord onboarding form'], more: ['Agreement: Master Lease (sublease)', 'Agreement: Estate agency'],
    hint: 'The welcome documents and onboarding form are ticked. Tick the one Agreement that fits this landlord (Master Lease or Estate agency) before you send.' },
  { key: 'cohost', label: 'Co-host', reg: 'cohost', pick: ['Welcome to NOVOURQ', 'Welcome letter', 'Company brochure', 'Vacation rental landlord pack', 'Co-host portal guide', 'Cohost detail sheet', 'Agreement: Shortlet co-host'], more: [],
    hint: 'Everything a co-host needs is ticked, including the Shortlet co-host agreement and the Cohost detail sheet.' },
  { key: 'tenant', label: 'Tenant', reg: '', pick: ['Welcome to NOVOURQ', 'Furnished apartments', 'Tenants portal guide', 'Tenant deposit guide'], more: [], hint: 'The tenant documents are ticked.' },
  { key: 'all', label: 'All documents', reg: '', pick: [], more: [], hint: 'Every document, for managing or building your own mix.' },
]
const AUDIENCE_TITLES = new Set(TABS.flatMap(t => [...t.pick, ...t.more]))

export default function ServicesPack() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<string[]>([]), [name, setName] = useState('')
  const [tab, setTab] = useState<'landlord' | 'cohost' | 'tenant' | 'all'>('landlord'), [ready, setReady] = useState(false)
  const [reg, setReg] = useState<'' | 'landlord' | 'cohost' | 'existing'>(''), [who, setWho] = useState<any>(null), [q, setQ] = useState(''), [found, setFound] = useState<any[]>([])
  useEffect(() => { if (q.trim().length < 2) { setFound([]); return }; const t = setTimeout(() => staffApi('/api/documents?people=' + encodeURIComponent(q)).then((r: any) => setFound((r.people || []).filter((x: any) => ['pm_owner', 'ea_owner', 'cohost'].includes(x.kind)))).catch(() => {}), 250); return () => clearTimeout(t) }, [q])
  const [add, setAdd] = useState<any>(null), [edit, setEdit] = useState<any>(null)
  const load = () => staffApi('/api/services').then((r: any) => { setD(r); setSel(s => s.filter(i => r.docs.some((x: any) => x.id === i && x.active))) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const act = async (body: any, ok?: string) => { setBusy(true); setErr(''); setNote(''); try { const r = await staffApi('/api/services', body); if (ok) setNote(ok); await load(); return r } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const up = async (f: File) => {
    const path = `services/${Date.now()}-${Math.random().toString(36).slice(2)}.${f.name.split('.').pop()}`
    const { error } = await supabase.storage.from('pm-files').upload(path, f, { contentType: f.type })
    if (error) throw new Error(error.message)
    return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
  }
  const url = (t: string) => `${window.location.origin}/s/${t}`
  const copy = async (text: string, msg: string) => { try { await navigator.clipboard.writeText(text); setNote(msg) } catch { setNote(text) } }
  const docs: any[] = d?.docs || [], links: any[] = d?.links || []
  const T = TABS.find(t => t.key === tab)!
  const shown = tab === 'all' ? docs : docs.filter(x => T.pick.includes(x.title) || T.more.includes(x.title) || !AUDIENCE_TITLES.has(x.title))
  const openTab = (k: typeof tab) => { const t = TABS.find(z => z.key === k)!; setTab(k); setSel(docs.filter(x => x.active && t.pick.includes(x.title)).map(x => x.id)); setReg(t.reg); setWho(null); setName(t.key === 'all' ? '' : `${t.label} pack`) }
  useEffect(() => { if (docs.length && !ready) { setReady(true); openTab('landlord') } })   // eslint-disable-line react-hooks/exhaustive-deps
  const title = (id: string) => docs.find(x => x.id === id)?.title || 'Removed document'

  return (
    <CrmPage>
      <CrmHeader title="Services Pack" subtitle="Our brochure, landlord pack and flyers in one place. Make a link for one document or several, and put it in any email. Links stay live until you pause them." actions={<button style={btn('gold')} onClick={() => setAdd({ file: null, title: '', description: '' })}>+ Add document</button>} />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {note && <div style={{ color: '#067647', marginBottom: 12, wordBreak: 'break-all' }}>{note}</div>}
        {!d ? (!err && <Loading />) : <>
          {add && (
            <div style={{ ...card, maxWidth: 560, display: 'grid', gap: 10 }}>
              <div><span style={label}>PDF file</span><input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0] ?? null; setAdd({ ...add, file: f, title: add.title || (f ? f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ') : '') }) }} /></div>
              <div><span style={label}>Name</span><input style={input} value={add.title} onChange={e => setAdd({ ...add, title: e.target.value })} /></div>
              <div><span style={label}>Short description</span><input style={input} value={add.description} onChange={e => setAdd({ ...add, description: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold')} disabled={busy} onClick={async () => { if (!add.file) return setErr('Choose a PDF first.'); setBusy(true); try { const u = await up(add.file); setBusy(false); await act({ action: 'doc-add', title: add.title, description: add.description, url: u }); setAdd(null) } catch (e: any) { setBusy(false); setErr(e.message) } }}>{busy ? 'Uploading…' : 'Save document'}</button><button style={btn('ghost')} onClick={() => setAdd(null)}>Cancel</button></div>
            </div>
          )}

          <div style={{ ...head, marginTop: 4 }}>1. Choose what to send</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {TABS.map(t => <button key={t.key} onClick={() => openTab(t.key)} style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${tab === t.key ? '#182D5E' : '#D0D5DD'}`, background: tab === t.key ? '#182D5E' : '#fff', color: tab === t.key ? '#fff' : '#344054', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{t.label}</button>)}
          </div>
          <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 8 }}>{T.hint}</div>
          {docs.length === 0 ? <Empty>No documents yet. Press Add document and upload a PDF.</Empty> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {shown.map(x => (
                <div key={x.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', opacity: x.active ? 1 : .55 }}>
                  <input type="checkbox" disabled={!x.active} checked={sel.includes(x.id)} onChange={e => setSel(e.target.checked ? [...sel, x.id] : sel.filter(i => i !== x.id))} />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    {edit?.id === x.id ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <input style={input} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
                        <input style={input} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />
                        <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!edit.fillable} onChange={e => setEdit({ ...edit, fillable: e.target.checked })} />Recipients fill this in online and submit it back (needs a fillable PDF)</label>
                        <div><span style={label}>Replace the PDF (optional). Links already sent show the new version.</span><input type="file" accept="application/pdf" onChange={e => setEdit({ ...edit, file: e.target.files?.[0] ?? null })} /></div>
                        <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold', true)} disabled={busy} onClick={async () => { try { const body: any = { action: 'doc-update', id: x.id, title: edit.title, description: edit.description, fillable: !!edit.fillable }; if (edit.file) body.url = await up(edit.file); await act(body); setEdit(null) } catch (e: any) { setErr(e.message) } }}>Save</button><button style={btn('ghost', true)} onClick={() => setEdit(null)}>Cancel</button></div>
                      </div>
                    ) : <>
                      <a href={x.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#1B2F6E', textDecoration: 'none' }}>{x.title}</a>
                      <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{x.description || 'No description'}{x.fillable ? ' · Fillable online' : ''}{x.active ? '' : ' · Hidden from links'}</div>
                    </>}
                  </div>
                  {edit?.id !== x.id && <>
                    <button style={btn('ghost', true)} onClick={() => setEdit({ id: x.id, title: x.title, description: x.description || '', fillable: !!x.fillable, file: null })}>Edit</button>
                    <button style={btn('ghost', true)} onClick={() => act({ action: 'doc-update', id: x.id, active: !x.active })}>{x.active ? 'Hide' : 'Show'}</button>
                    {d.isAdmin && <button style={btn('ghost', true)} onClick={() => { if (confirm('Delete this document? Links that include it stop showing it.')) act({ action: 'doc-delete', id: x.id }) }}>Delete</button>}
                  </>}
                </div>
              ))}
            </div>
          )}

          <div style={head}>2. Make the link</div>
          <div style={{ ...card, maxWidth: 560, display: 'grid', gap: 10 }}>
            <div><span style={label}>Link name (only you see this, e.g. the person or campaign)</span><input style={input} value={name} placeholder="Spring landlord campaign" onChange={e => setName(e.target.value)} /></div>
            <div>
              <span style={label}>Who is this link for? Anything they submit is filed on their record in Documents.</span>
              <select style={input} value={reg} onChange={e => { setReg(e.target.value as any); setWho(null) }}>
                <option value="">No one in particular (copies stay in Submitted documents)</option>
                <option value="landlord">A new landlord (registered when they submit)</option>
                <option value="cohost">A new co-host (registered when they submit)</option>
                <option value="existing">An existing landlord or co-host</option>
              </select>
              {reg === 'existing' && (who ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, marginTop: 6 }}><b>{who.name}</b><span style={{ color: '#667085' }}>{who.label}</span><button style={btn('ghost', true)} onClick={() => setWho(null)}>Change</button></div> : <>
                <input style={{ ...input, marginTop: 6 }} value={q} placeholder="Search landlords and co-hosts by name" onChange={e => setQ(e.target.value)} />
                {found.length > 0 && <div style={{ border: '1px solid #E4E7EC', borderRadius: 6, marginTop: 4, background: '#fff' }}>{found.map(x => <div key={x.kind + x.id} onClick={() => { setWho(x); setQ(''); setFound([]); setName(n => n || x.name) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13.5, borderTop: '1px solid #F2F4F7' }}><b>{x.name}</b> <span style={{ color: '#667085' }}>{x.label}</span></div>)}</div>}
              </>)}
              {(reg === 'landlord' || reg === 'cohost') && <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>When they press Submit, a {reg === 'landlord' ? 'landlord' : 'co-host'} record is created from the name and email they enter (or matched by email if they already exist) and the completed document is filed on it.</div>}
            </div>
            <div style={{ fontSize: 13, color: '#475467' }}>{sel.length === 0 ? 'Tick the documents above.' : sel.length === 1 ? 'This link opens one document.' : `This link lets them choose from ${sel.length} documents.`}</div>
            <div><button style={btn('gold')} disabled={busy || !sel.length} onClick={async () => { const r = await act({ action: 'link-create', name, doc_ids: sel, ...(reg === 'existing' && who ? { subject: who.kind === 'pm_owner' ? 'landlord' : who.kind === 'ea_owner' ? 'ea_landlord' : 'cohost', subject_id: who.id } : reg === 'landlord' || reg === 'cohost' ? { register: reg } : {}) }); if (r?.link) { copy(url(r.link.token), `Link copied: ${url(r.link.token)}`); setName(''); setWho(null); setReg('') } }}>Create link</button></div>
          </div>

          <div style={head}>3. Your links</div>
          {links.length === 0 ? <Empty>No links yet.</Empty> : (
            <div style={{ display: 'grid', gap: 10 }}>
              {links.map(l => {
                const u = url(l.token)
                return (
                  <div key={l.id} style={{ ...card, marginBottom: 0, opacity: l.active ? 1 : .6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div><b>{l.name}</b>{l.subject && <span style={{ marginLeft: 8, fontSize: 12, color: '#182D5E' }}>{l.subject_name ? `for ${l.subject_name}` : `new ${l.subject === 'cohost' ? 'co-host' : 'landlord'}, registers on submit`}</span>}{!l.active && <span style={{ marginLeft: 8, fontSize: 11, color: '#B42318', fontWeight: 700 }}>PAUSED</span>}
                        <div style={{ fontSize: 12, color: '#667085', marginTop: 3, wordBreak: 'break-all' }}>{u}</div></div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <button style={btn('ghost', true)} onClick={() => copy(u, `Link copied: ${u}`)}>Copy link</button>
                        <button style={btn('ghost', true)} onClick={() => copy(l.subject ? `Welcome to NOVOURQ. To get you set up, please use your private onboarding link to add your details and sign your agreement. It only takes a few minutes. This link is personal to you. If you need a hand or a new link, just reply to this message.\n\n${u}` : `Welcome to NOVOURQ. Please use your private link to view our services and documents. If you need a hand, just reply to this message.\n\n${u}`, 'Email wording copied. Paste it into your email.')}>Copy for email</button>
                        <a href={u} target="_blank" rel="noreferrer" style={btn('ghost', true)}>Preview</a>
                        <button style={btn('ghost', true)} onClick={() => act({ action: 'link-update', id: l.id, active: !l.active })}>{l.active ? 'Pause' : 'Turn on'}</button>
                        <button style={btn('ghost', true)} onClick={() => { if (confirm('Delete this link? Anyone who has it will no longer be able to open it.')) act({ action: 'link-delete', id: l.id }) }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#344054', marginTop: 10 }}><b>{l.opens}</b> {l.opens === 1 ? 'open' : 'opens'} · last opened {when(l.last_opened_at)}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {(l.doc_ids as string[]).map(i => <span key={i} style={{ fontSize: 12, background: '#EEF2F9', border: '1px solid #D5DCEA', borderRadius: 12, padding: '3px 10px', color: '#182D5E' }}>{title(i)} · {l.doc_views[i] || 0} {(l.doc_views[i] || 0) === 1 ? 'view' : 'views'}</span>)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ ...head, marginTop: 24 }}>3. Submitted documents</div>
          {(d?.submissions || []).length === 0 ? <Empty>Nothing submitted yet. When a recipient fills in a document on their link and presses Submit, it appears here.</Empty> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {(d?.submissions || []).map((s: any) => (
                <div key={s.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div><b>{s.doc_title}</b><div style={{ fontSize: 12.5, color: '#667085', marginTop: 3 }}>{s.submitter_name || 'No name'}{s.submitter_email ? ` · ${s.submitter_email}` : ''} · link {s.link_name || ''} · {when(s.created_at)}{s.filed_for ? ` · filed on ${s.filed_for}’s record, awaiting review in Documents` : ''}</div></div>
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={btn('gold', true)}>Open completed PDF</a>}
                </div>
              ))}
            </div>
          )}
        </>}
      </Body>
    </CrmPage>
  )
}
