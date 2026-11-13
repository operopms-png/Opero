'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BUILT_IN_PICTURES } from '../../lib/tab-pictures'
import { buildGuides, GUIDE_AREAS } from '../../lib/tab-guides'
import { WHATS_NEW } from '../../lib/whats-new'
import { HELP_VIDEOS } from '../../lib/help-videos'
import { C, btn } from '../crm/Page'

const AREA_VIDEO: Record<string, string> = { 'Real Estate Intelligence': 'real-estate-intelligence', 'Human Intelligence Hub': 'human-intelligence-hub', 'Novourq Cloud AI': 'novourq-cloud-ai', Dashboard: 'getting-started', Settings: 'settings' }
const SEEN = 'novourq_whatsnew_seen'

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null
}

export default function PortalGuides({ accountId, isAdmin, userEmail }: { accountId: string; isAdmin: boolean; userEmail: string }) {
  const guides = useMemo(() => buildGuides(), [])
  const [area, setArea] = useState('All')
  const [q, setQ] = useState('')
  const [cur, setCur] = useState<string>('')
  const [media, setMedia] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const [seen, setSeen] = useState<string>('')
  const [err, setErr] = useState('')

  useEffect(() => { try { setSeen(localStorage.getItem(SEEN) ?? '') } catch {} }, [])
  useEffect(() => { supabase.from('tab_guide_media').select('*').eq('user_id', accountId).order('created_at').then(({ data }) => setMedia(data ?? [])) }, [accountId])

  const list = guides.filter(g => (area === 'All' || g.area === area) && (!q || (g.title + ' ' + g.group).toLowerCase().includes(q.toLowerCase())))
  const g = guides.find(x => x.key === cur && list.includes(x)) ?? list[0]
  const mine = (k: string, kind: string) => media.filter(m => m.tab_key === k && m.kind === kind)
  const fresh = WHATS_NEW.filter(n => !seen || n.date > seen)
  const areaVideo = g ? HELP_VIDEOS.find(v => v.id === AREA_VIDEO[g.area]) : undefined

  function markSeen() { const d = WHATS_NEW[0]?.date ?? ''; try { localStorage.setItem(SEEN, d) } catch {}; setSeen(d) }

  async function addMedia(kind: 'image' | 'video', url: string) {
    if (!g) return
    const { data, error } = await supabase.from('tab_guide_media').insert({ user_id: accountId, tab_key: g.key, kind, url, created_by_email: userEmail }).select().single()
    if (error) { setErr(error.message); return }
    setErr(''); setMedia(m => [...m, data])
  }
  async function upload(file: File, kind: 'image' | 'video') {
    setBusy(true); setErr('')
    const path = `guides/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('pm-files').upload(path, file)
    setBusy(false)
    if (error) { setErr(error.message); return }
    await addMedia(kind, supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl)
  }
  async function remove(id: string) { await supabase.from('tab_guide_media').delete().eq('id', id); setMedia(m => m.filter(x => x.id !== id)) }

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.border ?? '#E4E7EC'}`, borderRadius: 10, padding: 16 }
  const slot: React.CSSProperties = { border: '1px dashed #C9D1DE', background: '#F5F7FB', borderRadius: 8, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#667085', fontSize: 13, padding: 12, textAlign: 'center' }

  return (
    <div>
      {fresh.length > 0 && (
        <div style={{ ...card, marginBottom: 16, borderColor: '#2F6DB5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 15 }}>What&rsquo;s new in the portal</b>
            <button onClick={markSeen} style={btn('ghost', true)}>Mark all as read</button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {fresh.slice(0, 6).map((n, i) => (
              <div key={i} style={{ fontSize: 13.5 }}><span style={{ background: '#E6F0FB', color: '#2F6DB5', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 999, marginRight: 8 }}>NEW</span><b>{n.title}</b> <span style={{ color: '#667085' }}>({new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})</span><div style={{ color: '#475467' }}>{n.text}</div></div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {GUIDE_AREAS.map(a => <button key={a} onClick={() => { setArea(a); setCur('') }} aria-pressed={area === a} style={{ border: '1px solid #D0D5DD', background: area === a ? '#2F6DB5' : '#fff', color: area === a ? '#fff' : '#475467', borderRadius: 999, padding: '6px 13px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{a}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 12, alignItems: 'start' }}>
        <div style={{ ...card, padding: 10, maxHeight: 640, overflow: 'auto' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tabs" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontFamily: 'inherit', marginBottom: 6 }} />
          {list.map(x => {
            const on = g?.key === x.key
            const p = mine(x.key, 'image').length > 0, v = mine(x.key, 'video').length > 0
            return <button key={x.area + x.key} onClick={() => setCur(x.key)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8, textAlign: 'left', border: 'none', background: on ? '#E6F0FB' : 'none', color: on ? '#2F6DB5' : '#323338', fontWeight: on ? 700 : 400, padding: '8px 10px', borderRadius: 6, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span>{x.title}<span style={{ display: 'block', fontSize: 11.5, color: '#98A2B3', fontWeight: 400 }}>{x.group}</span></span>
              <span style={{ display: 'flex', gap: 3 }} title="Steps, picture, video">{[true, p, v].map((d, i) => <i key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: d ? '#00A86B' : '#D0D5DD' }} />)}</span>
            </button>
          })}
          {list.length === 0 && <div style={{ color: '#667085', fontSize: 13, padding: 8 }}>No tabs match.</div>}
        </div>
        {g && (
          <div style={card}>
            <div style={{ fontSize: 12.5, color: '#667085' }}>{g.area} &middot; {g.group}</div>
            <h2 style={{ margin: '2px 0 8px', fontSize: 20 }}>{g.title}</h2>
            {g.text && <p style={{ margin: '0 0 12px', color: '#475467' }}>{g.text}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><b style={{ fontSize: 14 }}>How to use it</b>{!g.full && <span style={{ fontSize: 11, color: '#B54708', background: '#FEF0C7', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>Basic guide</span>}</div>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 12, marginTop: 16 }}>
              <div>
                <b style={{ fontSize: 14 }}>Pictures</b>
                <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                  {(BUILT_IN_PICTURES[g.key] ?? []).map(b => <figure key={b.src} style={{ margin: 0 }}><img src={b.src} alt={g.title} style={{ width: '100%', borderRadius: 8, border: '1px solid #E4E7EC' }} /><figcaption style={{ fontSize: 12.5, color: '#475467', marginTop: 4, lineHeight: 1.4 }}>{b.caption}</figcaption></figure>)}
                  {mine(g.key, 'image').map(m => <div key={m.id}><img src={m.url} alt={g.title} style={{ width: '100%', borderRadius: 8, border: '1px solid #E4E7EC' }} />{isAdmin && <button onClick={() => remove(m.id)} style={{ ...btn('ghost', true), marginTop: 4 }}>Remove</button>}</div>)}
                  {mine(g.key, 'image').length === 0 && !(BUILT_IN_PICTURES[g.key]?.length) && <div style={slot}>No picture yet{isAdmin && <label style={{ ...btn('ghost', true), cursor: 'pointer' }}>Upload picture<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'image')} /></label>}</div>}
                  {isAdmin && mine(g.key, 'image').length > 0 && <label style={{ ...btn('ghost', true), cursor: 'pointer', justifySelf: 'start' }}>Add another<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'image')} /></label>}
                </div>
              </div>
              <div>
                <b style={{ fontSize: 14 }}>Video</b>
                <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                  {mine(g.key, 'video').map(m => { const e = embedUrl(m.url); return <div key={m.id}>{e ? <iframe src={e} style={{ width: '100%', aspectRatio: '16 / 9', border: 'none', borderRadius: 8 }} allowFullScreen /> : <video src={m.url} controls style={{ width: '100%', borderRadius: 8 }} />}{isAdmin && <button onClick={() => remove(m.id)} style={{ ...btn('ghost', true), marginTop: 4 }}>Remove</button>}</div> })}
                  {mine(g.key, 'video').length === 0 && areaVideo && <div><video src={`/help/${areaVideo.id}.mp4`} poster={`/help/${areaVideo.id}.jpg`} controls preload="none" style={{ width: '100%', borderRadius: 8 }} /><div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>{areaVideo.title} overview. A video for this tab specifically has not been added yet.</div></div>}
                  {isAdmin && <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ ...btn('ghost', true), cursor: 'pointer', justifySelf: 'start' }}>Upload video<input type="file" accept="video/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0], 'video')} /></label>
                    <div style={{ display: 'flex', gap: 6 }}><input value={link} onChange={e => setLink(e.target.value)} placeholder="Or paste a YouTube or Vimeo link" style={{ flex: 1, minWidth: 0, padding: '7px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} /><button disabled={!link.trim()} onClick={async () => { await addMedia('video', link.trim()); setLink('') }} style={btn('gold', true)}>Add</button></div>
                  </div>}
                </div>
              </div>
            </div>
            {busy && <div style={{ fontSize: 12.5, color: '#667085', marginTop: 8 }}>Uploading&hellip;</div>}
            {err && <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 8 }}>{err}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
