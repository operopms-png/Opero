'use client'
// Marketing → Video library: the company's marketing videos and pictures in one place, each with
// its caption, hashtags, platforms, status and planned post date. Posting is done by hand for now:
// download the file, copy the post text, then tick where it went.
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { C, Modal, btn, input, label } from '../crm/Page'
import { PLATFORMS, STATUSES, VIDEO_BUCKET, VIDEO_MIMES, MAX_VIDEO_BYTES, fileSize, isImage, postText, type VideoRow } from '../../lib/marketing-videos'

async function api(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/marketing-videos', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}

const STATUS_COLOR: Record<string, [string, string]> = { Draft: ['#EEF0F4', '#676879'], Ready: ['#E1F0FF', '#1D4E89'], Scheduled: ['#FFF1D6', '#9A6200'], Posted: ['#DDF5EA', '#0B7A4B'] }
const tag = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11.5, padding: '2px 8px', borderRadius: 3, background: bg, color: fg, fontWeight: 500, whiteSpace: 'nowrap' })
const toLocalInput = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(+d)) return ''; const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
const niceDate = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

type Draft = { id?: string; title: string; caption: string; hashtags: string; platforms: string[]; status: string; scheduled_for: string; notes: string }
const BLANK: Draft = { title: '', caption: '', hashtags: '', platforms: [], status: 'Draft', scheduled_for: '', notes: '' }

export default function VideoLibrary() {
  const [list, setList] = useState<VideoRow[] | null>(null)
  const [me, setMe] = useState({ name: '', isAdmin: false })
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<VideoRow | 'new' | null>(null)
  const [toast, setToast] = useState('')
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000) }

  const load = () => api().then(d => { setList(d.videos); setMe({ name: d.me, isAdmin: d.isAdmin }) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const shown = useMemo(() => (list ?? []).filter(v => (!status || v.status === status) && (!q || `${v.title} ${v.caption ?? ''} ${v.hashtags ?? ''} ${v.platforms.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [list, q, status])
  const counts = useMemo(() => { const m: Record<string, number> = {}; for (const v of list ?? []) m[v.status] = (m[v.status] ?? 0) + 1; return m }, [list])

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
      <div style={{ padding: '22px 28px 16px', background: 'linear-gradient(135deg,#EAF3FC,#C9DEF3)', borderBottom: '1px solid ' + C.creamLine, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: C.brown, margin: '0 0 2px' }}>Video library</h1>
          <div style={{ fontSize: 13, color: C.muted, maxWidth: 720, lineHeight: 1.5 }}>Keep your marketing videos and pictures here with their caption, hashtags and the platforms they are for. When you post, download the file, copy the post text, then tick where it went. Only your own company sees these files.</div>
        </div>
        <button style={btn('gold')} onClick={() => setOpen('new')}>+ Add video</button>
      </div>

      <div style={{ padding: '16px 28px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search videos…" style={{ ...input, flex: 1, minWidth: 200, width: 'auto' }} />
          {['', ...STATUSES].map(s => (
            <button key={s || 'all'} onClick={() => setStatus(s)} style={{ fontSize: 12.5, padding: '5px 11px', borderRadius: 14, border: '1px solid ' + (status === s ? C.ink : C.border), background: status === s ? C.ink : '#fff', color: status === s ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{s || 'All'}{s && counts[s] ? ` ${counts[s]}` : ''}</button>
          ))}
        </div>

        {err && <div style={{ color: C.red, padding: 20 }}>{err}</div>}
        {!list && !err && <div style={{ color: C.faint, padding: 20 }}>Loading videos…</div>}
        {list && !list.length && <div style={{ color: C.muted, padding: '30px 0', fontSize: 14 }}>No videos yet. Press <b>+ Add video</b> and upload your first one.</div>}
        {list && !!list.length && !shown.length && <div style={{ color: C.muted, padding: '30px 0', fontSize: 14 }}>Nothing matches that search.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {shown.map(v => {
            const [bg, fg] = STATUS_COLOR[v.status] ?? STATUS_COLOR.Draft
            return (
              <div key={v.id} onClick={() => setOpen(v)} className="crm-nav" style={{ border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ aspectRatio: '16 / 10', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {v.url ? (isImage(v.mime)
                    ? <img src={v.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <video src={v.url + '#t=0.5'} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />)
                    : <span style={{ color: '#fff', fontSize: 12 }}>Preview unavailable</span>}
                </div>
                <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={tag(bg, fg)}>{v.status}</span>
                    {v.platforms.map(p => <span key={p} style={tag('#F3F4F8', v.posted_platforms.includes(p) ? '#0B7A4B' : C.muted)}>{v.posted_platforms.includes(p) ? '✓ ' : ''}{p}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: C.faint }}>{[v.scheduled_for ? 'Post ' + niceDate(v.scheduled_for) : '', fileSize(v.size_bytes), v.created_by ?? ''].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {open && <Editor key={open === 'new' ? 'new' : open.id} video={open === 'new' ? null : open} me={me} onClose={() => setOpen(null)} onChanged={(msg) => { flash(msg); load() }} />}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13.5, zIndex: 80 }}>{toast}</div>}
    </div>
  )
}

function Editor({ video, me, onClose, onChanged }: { video: VideoRow | null; me: { name: string; isAdmin: boolean }; onClose: () => void; onChanged: (msg: string) => void }) {
  const [d, setD] = useState<Draft>(video ? { id: video.id, title: video.title, caption: video.caption ?? '', hashtags: video.hashtags ?? '', platforms: video.platforms, status: video.status, scheduled_for: toLocalInput(video.scheduled_for), notes: video.notes ?? '' } : BLANK)
  const [file, setFile] = useState<File | null>(null)
  const [posted, setPosted] = useState<string[]>(video?.posted_platforms ?? [])
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (p: Partial<Draft>) => setD(x => ({ ...x, ...p }))
  const togglePlat = (p: string) => set({ platforms: d.platforms.includes(p) ? d.platforms.filter(x => x !== p) : [...d.platforms, p] })
  const canDelete = !!video && (me.isAdmin || video.created_by === me.name)

  const pickFile = (f: File | null) => {
    setErr('')
    if (!f) return setFile(null)
    if (!VIDEO_MIMES.includes(f.type)) return setErr('Use an MP4, MOV or WebM video, or a JPG, PNG or WebP picture.')
    if (f.size > MAX_VIDEO_BYTES) return setErr('That file is over 500 MB. Compress it and try again.')
    setFile(f)
    if (!d.title) set({ title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() })
  }

  async function save() {
    setErr('')
    if (!d.title.trim()) return setErr('Give the video a title.')
    if (!video && !file) return setErr('Choose a video or picture to upload.')
    const payload = { ...d, scheduled_for: d.scheduled_for ? new Date(d.scheduled_for).toISOString() : null }
    try {
      if (video) {
        setBusy('Saving…')
        await api({ action: 'save', id: video.id, video: payload })
        onChanged('Saved'); return onClose()
      }
      setBusy('Uploading… keep this page open')
      const s = await api({ action: 'sign', name: file!.name, mime: file!.type, size: file!.size })
      const up = await supabase.storage.from(VIDEO_BUCKET).uploadToSignedUrl(s.path, s.token, file!, { contentType: file!.type })
      if (up.error) throw new Error(up.error.message || 'The upload failed. Try again.')
      setBusy('Saving…')
      await api({ action: 'save', path: s.path, video: { ...payload, file_name: file!.name, mime: file!.type, size_bytes: file!.size } })
      onChanged('Added to the video library'); onClose()
    } catch (e: any) { setErr(e.message || 'Something went wrong'); setBusy('') }
  }

  async function markPosted(next: string[]) {
    setPosted(next); setErr('')
    try { await api({ action: 'posted', id: video!.id, platforms: next }); onChanged(next.length ? 'Posting noted' : 'Posting cleared') }
    catch (e: any) { setErr(e.message) }
  }

  async function remove() {
    if (!video || !confirm('Delete this video? This cannot be undone.')) return
    setBusy('Deleting…')
    try { await api({ action: 'delete', id: video.id }); onChanged('Deleted'); onClose() } catch (e: any) { setErr(e.message); setBusy('') }
  }

  const copy = () => navigator.clipboard?.writeText(postText(d)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => setErr('Could not copy. Select the text and copy it by hand.'))
  const field: React.CSSProperties = { marginBottom: 14 }

  return (
    <Modal title={video ? 'Video details' : 'Add video'} onClose={() => !busy && onClose()} width={640}>
      {video?.url && (
        <div style={{ background: '#0F1117', borderRadius: 6, overflow: 'hidden', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          {isImage(video.mime) ? <img src={video.url} alt="" style={{ maxWidth: '100%', maxHeight: 340 }} /> : <video src={video.url} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: 340 }} />}
        </div>
      )}

      {!video && (
        <div style={field}>
          <label style={label}>Video or picture</label>
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,image/jpeg,image/png,image/webp" onChange={e => pickFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" style={btn('ghost')} onClick={() => fileRef.current?.click()}>{file ? 'Choose another file' : 'Choose file'}</button>
            <span style={{ fontSize: 13, color: C.muted }}>{file ? `${file.name} · ${fileSize(file.size)}` : 'MP4, MOV or WebM video, or a JPG, PNG or WebP picture, up to 500 MB'}</span>
          </div>
        </div>
      )}

      <div style={field}><label style={label}>Title</label><input style={input} value={d.title} maxLength={200} onChange={e => set({ title: e.target.value })} placeholder="Flexible Living, Montego Bay townhouse" /></div>
      <div style={field}><label style={label}>Caption</label><textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} value={d.caption} maxLength={5000} onChange={e => set({ caption: e.target.value })} placeholder="The text that goes with the post" /></div>
      <div style={field}><label style={label}>Hashtags</label><input style={input} value={d.hashtags} maxLength={1000} onChange={e => set({ hashtags: e.target.value })} placeholder="#NOVOURQ #FlexibleLiving #FurnishedApartments" /></div>

      <div style={field}>
        <label style={label}>Platforms</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => { const on = d.platforms.includes(p); return <button key={p} type="button" onClick={() => togglePlat(p)} style={{ fontSize: 13, padding: '5px 12px', borderRadius: 14, border: '1px solid ' + (on ? C.goldDark : C.border), background: on ? C.goldDark : '#fff', color: on ? '#fff' : C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button> })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, ...field }}>
        <div><label style={label}>Status</label><select style={input} value={d.status} onChange={e => set({ status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label style={label}>Planned post time</label><input type="datetime-local" style={input} value={d.scheduled_for} onChange={e => set({ scheduled_for: e.target.value })} /></div>
      </div>
      <div style={field}><label style={label}>Notes (only your team sees these)</label><input style={input} value={d.notes} maxLength={2000} onChange={e => set({ notes: e.target.value })} placeholder="For example: post at lunchtime, tag the property" /></div>

      {video && (
        <div style={{ border: '1px solid ' + C.row, borderRadius: 6, padding: '12px 14px', marginBottom: 14, background: '#FAFBFD' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Posting</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Download the file, copy the post text, post it on each platform, then tick where it went.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {video.download_url && <a href={video.download_url} style={btn('ghost', true)}>Download file</a>}
            <button type="button" style={btn('ghost', true)} onClick={copy} disabled={!postText(d)}>{copied ? 'Copied' : 'Copy post text'}</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(d.platforms.length ? d.platforms : [...PLATFORMS]).map(p => { const on = posted.includes(p); return <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 10px', border: '1px solid ' + C.border, borderRadius: 14, cursor: 'pointer', background: on ? '#DDF5EA' : '#fff' }}><input type="checkbox" checked={on} onChange={() => markPosted(on ? posted.filter(x => x !== p) : [...posted, p])} />{p}</label> })}
          </div>
          {video.posted_at && <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>Last noted {niceDate(video.posted_at)}</div>}
        </div>
      )}

      {err && <div style={{ color: C.red, fontSize: 13.5, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div>{canDelete && <button type="button" style={btn('danger')} disabled={!!busy} onClick={remove}>Delete</button>}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {busy && <span style={{ fontSize: 13, color: C.muted }}>{busy}</span>}
          <button type="button" style={btn('ghost')} disabled={!!busy} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...btn('gold'), opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={save}>{video ? 'Save' : 'Upload and save'}</button>
        </div>
      </div>
    </Modal>
  )
}
