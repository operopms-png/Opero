'use client'
// The owner's / tenant's Documents tab: what is needed, upload from the phone, status of each file, and files from their property manager.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Kind = 'landlord' | 'tenant' | 'ea_landlord' | 'ea_tenant' | 'cohost'
const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: bg, color: fg, whiteSpace: 'nowrap' })
const STATE: Record<string, [string, string, string]> = { todo: ['Required', '#FFF4E0', '#B54708'], pending: ['Being reviewed', '#E3EDFA', '#2F6DB5'], approved: ['Approved', '#E7F6EC', '#067647'], rejected: ['Replace', '#FEF3F2', '#B42318'], optional: ['Optional', '#F2F4F7', '#667085'], byus: ["We'll add this", '#F2F4F7', '#667085'] }

export default function PortalDocuments({ kind, id, accent = '#2F6DB5', link, contractReady }: { kind: Kind; id?: string; accent?: string; link?: string; contractReady?: boolean }) {
  const [d, setD] = useState<{ files: any[]; items: any[]; canUpload: boolean } | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [exp, setExp] = useState<Record<string, string>>({})
  const pick = useRef<HTMLInputElement>(null)
  const target = useRef('')
  const auth = async () => { if (link) return { 'x-client-link': link } as Record<string, string>; const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session?.access_token ?? ''}` } }
  const load = useCallback(async () => {
    const res = await fetch(`/api/portal-docs?kind=${kind}${id ? '&id=' + id : ''}`, { headers: await auth() })
    if (res.ok) setD(await res.json())
  }, [kind, id])
  useEffect(() => { load() }, [load])

  async function upload(f?: File) {
    const cat = target.current; if (!f || !cat) return
    setBusy(cat); setMsg('')
    const fd = new FormData(); fd.append('kind', kind); fd.append('category', cat); fd.append('file', f); if (exp[cat]) fd.append('expires_on', exp[cat])
    const res = await fetch('/api/portal-docs', { method: 'POST', headers: await auth(), body: fd })
    const j = await res.json().catch(() => ({}))
    setBusy(''); if (pick.current) pick.current.value = ''
    if (!res.ok) setMsg(j.error || 'Upload failed.'); else { setMsg('Uploaded. Your property manager will review it.'); load() }
  }
  async function remove(fid: string) {
    await fetch(`/api/portal-docs?kind=${kind}&id=${fid}`, { method: 'DELETE', headers: await auth() }); load()
  }
  if (!d) return null
  const todo = d.items.filter(i => i.state === 'todo' || i.state === 'rejected')
  const key = d.items.filter(i => !i.optional && i.state !== 'byus'), got = key.filter(i => i.state === 'approved' || i.state === 'pending').length
  const soon = (x?: string) => x && Math.ceil((new Date(x).getTime() - Date.now()) / 864e5) < 90
  const row = (it: any) => {
    const files = d.files.filter(f => f.category === it.key)
    const ready = it.state === 'byus' && !!contractReady
    const st = ready ? ['Ready to sign', '#E3EDFA', '#2F6DB5'] : (STATE[it.state] || STATE.todo)
    return (
      <div key={it.key} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>{it.label}</div><span style={pill(st[1], st[2])}>{st[0]}</span></div>
        <div style={{ fontSize: 12, color: it.state === 'rejected' ? '#B42318' : '#667085', marginTop: 2 }}>{it.state === 'rejected' && it.reason ? it.reason : ready ? 'Your agreement is prepared. You will read and sign it in the next step.' : it.hint}</div>
        {files.map(f => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, background: '#F2F7FD', borderRadius: 8, padding: '7px 10px', marginTop: 7 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: soon(f.expires_on) ? '#B54708' : undefined }}>{f.name}{f.expires_on ? ` · expires ${new Date(f.expires_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</span>
            <span style={{ whiteSpace: 'nowrap' }}>{f.url && <a href={f.url} target="_blank" rel="noreferrer" style={{ color: accent, fontWeight: 600, marginRight: 10 }}>View</a>}{f.mine && f.status === 'pending' && <button onClick={() => remove(f.id)} style={{ border: 'none', background: 'none', color: '#B42318', cursor: 'pointer', fontSize: 12.5, padding: 0 }}>Remove</button>}</span>
          </div>
        ))}
        {d.canUpload && (it.state !== 'approved' || it.optional) && it.state !== 'byus' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
            {it.expiry && <input type="date" value={exp[it.key] ?? ''} onChange={e => setExp({ ...exp, [it.key]: e.target.value })} title="Expiry date" style={{ fontSize: 13, padding: '8px', borderRadius: 8, border: '1px solid #C9D6E6' }} />}
            <button disabled={!!busy} onClick={() => { target.current = it.key; pick.current?.click() }} style={{ flex: 1, border: 'none', borderRadius: 9, background: accent, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>{busy === it.key ? 'Uploading…' : it.state === 'rejected' ? 'Upload a replacement' : 'Take photo or upload'}</button>
          </div>)}
      </div>)
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <input ref={pick} type="file" accept="application/pdf,image/*,.doc,.docx" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
      <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>{got} of {key.length} documents received</div>{todo.length > 0 && <span style={pill('#FFF4E0', '#B54708')}>{todo.length} to do</span>}</div>
        <div style={{ height: 7, background: '#E3EDFA', borderRadius: 4, marginTop: 8 }}><div style={{ height: 7, width: `${key.length ? (got / key.length) * 100 : 0}%`, background: accent, borderRadius: 4 }} /></div>
      </div>
      {msg && <div style={{ background: '#F2F7FD', border: '1px solid #C9DCF4', color: '#2F5DA0', borderRadius: 10, padding: '9px 12px', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      {todo.length > 0 && <><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#667085', textTransform: 'uppercase', margin: '4px 0 8px' }}>Action needed</div>{todo.map(row)}</>}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#667085', textTransform: 'uppercase', margin: '14px 0 8px' }}>{todo.length ? 'Everything else' : 'Your documents'}</div>
      {d.items.filter(i => !(i.state === 'todo' || i.state === 'rejected')).map(row)}
    </div>
  )
}
