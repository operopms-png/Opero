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

const PACKS: { name: string; titles: string[] }[] = [
  { name: 'Landlord pack', titles: ['Welcome to NOVOURQ', 'Company brochure', 'Lease your property to us', 'Landlord portal guide'] },
  { name: 'Co-host pack', titles: ['Welcome to NOVOURQ', 'Company brochure', 'Vacation rental landlord pack', 'Co-host portal guide'] },
  { name: 'Tenant pack', titles: ['Welcome to NOVOURQ', 'Furnished apartments', 'Tenants portal guide', 'Tenant deposit guide'] },
]

export default function ServicesPack() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<string[]>([]), [name, setName] = useState('')
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#475467' }}>Quick pick:</span>
            {PACKS.map(k => <button key={k.name} style={btn('ghost', true)} onClick={() => { setSel(docs.filter(x => x.active && k.titles.includes(x.title)).map(x => x.id)); setName(n => n || k.name) }}>{k.name}</button>)}
          </div>
          {docs.length === 0 ? <Empty>No documents yet. Press Add document and upload a PDF.</Empty> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {docs.map(x => (
                <div key={x.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', opacity: x.active ? 1 : .55 }}>
                  <input type="checkbox" disabled={!x.active} checked={sel.includes(x.id)} onChange={e => setSel(e.target.checked ? [...sel, x.id] : sel.filter(i => i !== x.id))} />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    {edit?.id === x.id ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <input style={input} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
                        <input style={input} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />
                        <div><span style={label}>Replace the PDF (optional). Links already sent show the new version.</span><input type="file" accept="application/pdf" onChange={e => setEdit({ ...edit, file: e.target.files?.[0] ?? null })} /></div>
                        <div style={{ display: 'flex', gap: 8 }}><button style={btn('gold', true)} disabled={busy} onClick={async () => { try { const body: any = { action: 'doc-update', id: x.id, title: edit.title, description: edit.description }; if (edit.file) body.url = await up(edit.file); await act(body); setEdit(null) } catch (e: any) { setErr(e.message) } }}>Save</button><button style={btn('ghost', true)} onClick={() => setEdit(null)}>Cancel</button></div>
                      </div>
                    ) : <>
                      <a href={x.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#1B2F6E', textDecoration: 'none' }}>{x.title}</a>
                      <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{x.description || 'No description'}{x.active ? '' : ' · Hidden from links'}</div>
                    </>}
                  </div>
                  {edit?.id !== x.id && <>
                    <button style={btn('ghost', true)} onClick={() => setEdit({ id: x.id, title: x.title, description: x.description || '', file: null })}>Edit</button>
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
            <div style={{ fontSize: 13, color: '#475467' }}>{sel.length === 0 ? 'Tick the documents above.' : sel.length === 1 ? 'This link opens one document.' : `This link lets them choose from ${sel.length} documents.`}</div>
            <div><button style={btn('gold')} disabled={busy || !sel.length} onClick={async () => { const r = await act({ action: 'link-create', name, doc_ids: sel }); if (r?.link) { copy(url(r.link.token), `Link copied: ${url(r.link.token)}`); setName('') } }}>Create link</button></div>
          </div>

          <div style={head}>3. Your links</div>
          {links.length === 0 ? <Empty>No links yet.</Empty> : (
            <div style={{ display: 'grid', gap: 10 }}>
              {links.map(l => {
                const u = url(l.token)
                return (
                  <div key={l.id} style={{ ...card, marginBottom: 0, opacity: l.active ? 1 : .6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div><b>{l.name}</b>{!l.active && <span style={{ marginLeft: 8, fontSize: 11, color: '#B42318', fontWeight: 700 }}>PAUSED</span>}
                        <div style={{ fontSize: 12, color: '#667085', marginTop: 3, wordBreak: 'break-all' }}>{u}</div></div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <button style={btn('ghost', true)} onClick={() => copy(u, `Link copied: ${u}`)}>Copy link</button>
                        <button style={btn('ghost', true)} onClick={() => copy(`See our services and choose what you’d like to view:\n${u}`, 'Email wording copied. Paste it into your email.')}>Copy for email</button>
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
        </>}
      </Body>
    </CrmPage>
  )
}
