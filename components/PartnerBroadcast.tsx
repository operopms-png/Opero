'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Partners → Broadcast
// A single group chat per business. Staff and investor partners post text
// and pictures; posts can be flagged as an investment opportunity.
// Live via Supabase Realtime, with a light poll as a fallback.

const GOLD = '#C9A84C'
const INK = '#1A1A1A'
const CREAM = '#FBF4E6'

type Props = {
  businessId: string | null
  userId: string
  authorName: string
  authorRole: 'staff' | 'investor'
  isStaff: boolean
}

async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `partner-broadcasts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, file)
  if (error) { console.error(error); return null }
  return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function PartnerBroadcast({ businessId, userId, authorName, authorRole, isStaff }: Props) {
  const [posts, setPosts] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [missing, setMissing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'opportunities'>('all')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isOpportunity, setIsOpportunity] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  async function load() {
    if (!businessId) return
    const { data, error } = await supabase
      .from('partner_broadcasts')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .limit(300)
    setMissing(!!error)
    setPosts(data ?? [])
    setLoaded(true)
  }

  useEffect(() => {
    if (!businessId) return
    load()
    const channel = supabase
      .channel(`partner-broadcast-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_broadcasts', filter: `business_id=eq.${businessId}` }, () => load())
      .subscribe()
    const poll = setInterval(load, 8000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  // Jump to the newest post when new ones arrive
  useEffect(() => {
    if (posts.length !== lastCount.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
    lastCount.current = posts.length
  }, [posts.length, filter])

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    const urls: string[] = []
    for (const f of Array.from(files).slice(0, 6)) {
      if (!f.type.startsWith('image/')) continue
      const url = await uploadImage(f)
      if (url) urls.push(url)
    }
    setImages(prev => [...prev, ...urls].slice(0, 6))
    setUploading(false)
  }

  async function send() {
    if (!businessId || (!body.trim() && images.length === 0)) return
    setSending(true)
    const { error } = await supabase.from('partner_broadcasts').insert({
      business_id: businessId,
      author_user_id: userId,
      author_name: authorName,
      author_role: authorRole,
      body: body.trim() || null,
      image_urls: images,
      is_opportunity: isOpportunity,
    })
    setSending(false)
    if (error) { alert(error.message); return }
    setBody(''); setImages([]); setIsOpportunity(false)
    await load()
  }

  async function remove(post: any) {
    if (!confirm('Delete this post for everyone?')) return
    const { error } = await supabase.from('partner_broadcasts').delete().eq('id', post.id)
    if (error) { alert(error.message); return }
    await load()
  }

  const shown = posts.filter(p => filter === 'all' || p.is_opportunity)

  if (!businessId) {
    return <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 20, fontSize: 13, color: '#667085' }}>The broadcast opens once a property is linked to your account.</div>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'min(72vh, 760px)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #EAECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Partners Broadcast</div>
          <div style={{ fontSize: 12, color: '#667085' }}>Team and partners · opportunities and updates</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['all', 'All'], ['opportunities', 'Opportunities']] as const).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${filter === k ? INK : '#D0D5DD'}`, background: filter === k ? INK : '#fff', color: filter === k ? '#fff' : '#344054' }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: 16, background: CREAM, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {missing && <div style={{ fontSize: 13, color: '#92400E', background: '#FFFAEB', border: '1px solid #FDB022', borderRadius: 8, padding: 12 }}>The broadcast table isn't in the database yet. Run <b>migrations/add-partner-broadcast.sql</b> in the Supabase SQL Editor.</div>}
        {loaded && !missing && shown.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3', textAlign: 'center', marginTop: 40 }}>{filter === 'all' ? 'No posts yet. Start the conversation.' : 'No opportunities posted yet.'}</div>}
        {shown.map(p => {
          const mine = p.author_user_id === userId
          const canDelete = mine || isStaff
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#667085', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: '#344054' }}>{mine ? 'You' : (p.author_name || 'Member')}</span>
                <span style={{ padding: '1px 7px', borderRadius: 10, fontWeight: 700, background: p.author_role === 'staff' ? INK : '#fff', color: p.author_role === 'staff' ? GOLD : '#667085', border: p.author_role === 'staff' ? 'none' : '1px solid #E4E7EC' }}>{p.author_role === 'staff' ? 'Team' : 'Partner'}</span>
                <span>{timeLabel(p.created_at)}</span>
              </div>
              <div style={{
                maxWidth: 'min(85%, 520px)', borderRadius: 14, padding: 10,
                background: mine ? INK : '#fff', color: mine ? '#fff' : '#101828',
                border: p.is_opportunity ? `2px solid ${GOLD}` : (mine ? 'none' : '1px solid #E4E7EC'),
              }}>
                {p.is_opportunity && <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Investment opportunity</div>}
                {(p.image_urls ?? []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: (p.image_urls.length === 1) ? '1fr' : '1fr 1fr', gap: 4, marginBottom: p.body ? 8 : 0 }}>
                    {p.image_urls.map((u: string) => (
                      <img key={u} src={u} alt="" onClick={() => setViewer(u)} style={{ width: '100%', height: p.image_urls.length === 1 ? 'auto' : 130, maxHeight: 320, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', display: 'block' }} />
                    ))}
                  </div>
                )}
                {p.body && <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.body}</div>}
              </div>
              {canDelete && <button onClick={() => remove(p)} style={{ background: 'none', border: 'none', color: '#98A2B3', fontSize: 11, cursor: 'pointer', marginTop: 2, fontFamily: 'inherit' }}>Delete</button>}
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div style={{ borderTop: '1px solid #EAECF0', padding: 12, background: '#fff' }}>
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {images.map(u => (
              <div key={u} style={{ position: 'relative' }}>
                <img src={u} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                <button onClick={() => setImages(prev => prev.filter(x => x !== u))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: INK, color: '#fff', fontSize: 12, cursor: 'pointer', lineHeight: '20px', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: '1px solid #D0D5DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer', color: '#344054' }} title="Add photos">
            {uploading ? '…' : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            )}
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { onPickImages(e.target.files); e.target.value = '' }} />
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Write a message…"
            rows={1}
            style={{ flex: 1, resize: 'none', padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', minHeight: 40, maxHeight: 140, boxSizing: 'border-box' }}
          />
          <button onClick={send} disabled={sending || uploading || (!body.trim() && images.length === 0)}
            style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: GOLD, color: INK, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: sending || (!body.trim() && images.length === 0) ? 0.6 : 1 }}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#344054', marginTop: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={isOpportunity} onChange={e => setIsOpportunity(e.target.checked)} />
          Post as an investment opportunity
        </label>
      </div>

      {/* Full-size image viewer */}
      {viewer && (
        <div onClick={() => setViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, cursor: 'zoom-out' }}>
          <img src={viewer} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}
