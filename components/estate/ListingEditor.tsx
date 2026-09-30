'use client'
// Estate Agency → Properties → edit: the "Photos & listing" part. Controls
// what tenants see on the public lettings link (/homes): the on/off switch,
// currency (J$ by default), availability, description, features, and photos
// (many per property — drag to reorder, first is the cover, add captions).
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENCIES } from '@/lib/listings-shared'

const GD = '#A8862E', BROWN = '#624920', CREAM = '#FBF4E6', LINE = '#E4E7EC', MUTED = '#667085'
export type ListingFields = { listed: boolean; currency: string; available_from: string; description: string; features: string[]; image_urls: string; photo_captions: Record<string, string> }

export function parseUrls(val: string | null | undefined): string[] {
  if (!val) return []
  try { const p = JSON.parse(val); if (Array.isArray(p)) return p.filter(Boolean) } catch {}
  return val.startsWith('http') ? [val] : []
}

// Shrink big phone photos before upload (max 2000px, JPEG) so the listings load fast
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)/i.test(file.type) || file.size < 400_000) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? blob : file
  } catch { return file }
}

async function upload(file: File): Promise<string | null> {
  const body = await shrink(file)
  const ext = body === file ? (file.name.split('.').pop() || 'jpg').toLowerCase() : 'jpg'
  const path = `estate-properties/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('pm-files').upload(path, body, { contentType: body === file ? file.type : 'image/jpeg', cacheControl: '31536000' })
  if (error) { console.error(error); return null }
  return supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl
}

export default function ListingEditor({ value, onChange, rentLabel, propertyId }: { value: ListingFields; onChange: (patch: Partial<ListingFields>) => void; rentLabel?: string; propertyId?: string }) {
  const urls = parseUrls(value.image_urls)
  const caps = value.photo_captions || {}
  const [busy, setBusy] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState(false)
  const [feat, setFeat] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const setUrls = (next: string[]) => {
    const keep: Record<string, string> = {}; next.forEach(u => { if (caps[u]) keep[u] = caps[u] })
    onChange({ image_urls: JSON.stringify(next), photo_captions: keep })
  }
  const move = (from: number, to: number) => { if (to < 0 || to >= urls.length || from === to) return; const n = [...urls]; const [x] = n.splice(from, 1); n.splice(to, 0, x); setUrls(n) }
  async function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    setBusy(b => b + files.length)
    const added: string[] = []
    for (const f of files) { const u = await upload(f); if (u) added.push(u); setBusy(b => b - 1) }
    onChange({ image_urls: JSON.stringify([...parseUrls(value.image_urls), ...added]) })
    if (added.length < files.length) alert(`${files.length - added.length} photo(s) couldn’t be uploaded — please try again.`)
  }
  const addFeature = () => { const f = feat.trim(); if (f && !value.features.includes(f)) onChange({ features: [...value.features, f] }); setFeat('') }

  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #D0D5DD', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', color: '#323338', background: '#fff' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#344054', marginBottom: 5 }
  const link = typeof window !== 'undefined' && propertyId ? `${window.location.origin}/homes/${propertyId}` : ''

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: BROWN, marginBottom: 12 }}>Photos &amp; listing</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: CREAM, border: '1px solid #F0E3C4', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: BROWN }}>Show on listings link</div>
          <div style={{ fontSize: 12, color: '#8A7248' }}>Tenants can see it at {typeof window !== 'undefined' ? window.location.host : 'app.sangstersgroup.com'}/homes{value.listed && link ? <> · <a href={link} target="_blank" rel="noreferrer" style={{ color: GD }}>view ↗</a></> : null}. Rented properties are hidden automatically.</div>
        </div>
        <button type="button" role="switch" aria-checked={value.listed} onClick={() => onChange({ listed: !value.listed })} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', background: value.listed ? '#00C875' : '#C4C4C4', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: value.listed ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div><label style={label}>Currency{rentLabel ? ` (for ${rentLabel})` : ''}</label>
          <select value={value.currency || 'JMD'} onChange={e => onChange({ currency: e.target.value })} style={{ ...input, cursor: 'pointer' }}>
            {Object.entries(CURRENCIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select></div>
        <div><label style={label}>Available from</label><input type="date" value={value.available_from || ''} onChange={e => onChange({ available_from: e.target.value })} style={input} /><div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Leave blank for “Available now”</div></div>
      </div>

      <div style={{ marginBottom: 12 }}><label style={label}>Description</label>
        <textarea value={value.description || ''} onChange={e => onChange({ description: e.target.value })} rows={4} placeholder="What makes this home great — the space, the area, what’s included…" style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} /></div>

      <div style={{ marginBottom: 14 }}><label style={label}>Features</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: value.features.length ? 8 : 0 }}>
          {value.features.map(f => <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${LINE}`, borderRadius: 16, padding: '3px 6px 3px 10px', fontSize: 12.5 }}>{f}<button type="button" onClick={() => onChange({ features: value.features.filter(x => x !== f) })} aria-label={`Remove ${f}`} style={{ border: 'none', background: '#F2F4F7', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 12, lineHeight: '16px', color: MUTED }}>×</button></span>)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={feat} onChange={e => setFeat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFeature() } }} placeholder="e.g. Parking, Furnished, Pool, Air conditioning — press Enter" style={input} />
          <button type="button" onClick={addFeature} style={{ padding: '0 14px', borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Add</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED, marginBottom: 6 }}>
        <span style={{ fontWeight: 500, color: '#344054' }}>Photos · {urls.length}</span>
        <span>Drag to reorder · first photo is the cover</span>
      </div>
      <div onDragOver={e => { if (drag === null) { e.preventDefault(); setOver(true) } }} onDragLeave={() => setOver(false)}
        onDrop={e => { if (drag === null) { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, padding: over ? 6 : 0, borderRadius: 8, outline: over ? `2px dashed ${GD}` : 'none' }}>
        {urls.map((u, i) => (
          <div key={u} draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} onDragOver={e => { if (drag !== null) e.preventDefault() }} onDrop={e => { if (drag !== null) { e.preventDefault(); move(drag, i); setDrag(null) } }}
            style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden', background: '#fff', opacity: drag === i ? 0.4 : 1, cursor: 'grab' }}>
            <div style={{ position: 'relative', height: 92 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {i === 0 && <span style={{ position: 'absolute', top: 5, left: 5, background: GD, color: '#fff', fontSize: 10.5, fontWeight: 600, borderRadius: 4, padding: '2px 6px' }}>Cover</span>}
              <button type="button" onClick={() => setUrls(urls.filter((_, k) => k !== i))} aria-label="Remove photo" style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: '22px' }}>×</button>
              <div style={{ position: 'absolute', bottom: 5, right: 5, display: 'flex', gap: 3 }}>
                {i > 0 && <button type="button" onClick={() => move(i, i - 1)} aria-label="Move earlier" title="Move earlier" style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'rgba(255,255,255,.92)', cursor: 'pointer', fontSize: 12 }}>←</button>}
                {i > 0 && <button type="button" onClick={() => move(i, 0)} title="Make cover" style={{ height: 22, borderRadius: 4, border: 'none', background: 'rgba(255,255,255,.92)', cursor: 'pointer', fontSize: 10.5, padding: '0 5px' }}>Cover</button>}
                {i < urls.length - 1 && <button type="button" onClick={() => move(i, i + 1)} aria-label="Move later" title="Move later" style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'rgba(255,255,255,.92)', cursor: 'pointer', fontSize: 12 }}>→</button>}
              </div>
            </div>
            <input value={caps[u] || ''} onChange={e => onChange({ photo_captions: { ...caps, [u]: e.target.value } })} placeholder="Caption (optional)" style={{ width: '100%', border: 'none', borderTop: `1px solid ${LINE}`, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} style={{ minHeight: 122, border: `2px dashed ${GD}`, borderRadius: 8, background: '#FFFCF5', color: GD, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          {busy ? `Uploading ${busy}…` : '+ Add photos'}<span style={{ fontWeight: 400, fontSize: 11.5, color: '#8A7248' }}>{busy ? 'please wait' : 'or drop them here'}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 8 }}>Add as many as you like from your phone or computer. Tenants swipe through them in this order.</div>
    </div>
  )
}
