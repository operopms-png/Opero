'use client'
// Staff Centre → Client Properties. Every property a client (owner) brings to
// us before it is signed: details and photos (imported from an MLS / Xposure
// link or typed in), the owner and who referred them, what they want, our
// Deal Analyser numbers, activity, documents and a stage:
//   New → Viewing → Numbers done → Offer made → Signed / Passed
// Signing can move it straight into Property Management or Vacation Rentals.
// List at /staff-centre/client-properties, one property at ?id=…
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { TextButton } from '../../../components/TextComposer'
import { C, CrmPage, CrmHeader, Body, Stat, Empty, Modal, Loading, btn, input, label } from '../../../components/crm/Page'

type P = any
const STAGES = [
  { k: 'new', l: 'New', bg: '#EEF2F7', c: '#344054' },
  { k: 'viewing', l: 'Viewing', bg: '#E8F0FB', c: '#1F5BB0' },
  { k: 'numbers', l: 'Numbers done', bg: '#FBF4E6', c: '#8E6B1F' },
  { k: 'offer', l: 'Offer made', bg: '#FFF0E0', c: '#A35A00' },
  { k: 'signed', l: 'Signed', bg: '#E6F7EF', c: '#0E7C55' },
  { k: 'passed', l: 'Passed', bg: '#F2F2F2', c: '#76736C' },
]
const ST = Object.fromEntries(STAGES.map(s => [s.k, s]))
const SERVICES = [
  { k: 'sell', l: 'Sell' }, { k: 'guaranteed_rent', l: 'Guaranteed rent' }, { k: 'partnership', l: 'Partnership management' },
  { k: 'airbnb', l: 'Airbnb management' }, { k: 'long_let', l: 'Long let' }, { k: 'unsure', l: 'Not sure yet' },
]
const SV = Object.fromEntries(SERVICES.map(s => [s.k, s.l]))
const TYPES = ['House', 'Apartment', 'Townhouse', 'Villa', 'Bungalow', 'Land', 'Commercial']
const SYM: Record<string, string> = { JMD: 'J$', USD: '$', GBP: '£' }
const INK = '#191815', GOLD = '#A8862E', GOLD_T = '#8E6B1F'

const money = (n: any, cur = 'JMD', short = false) => {
  if (n == null || n === '') return '—'
  const v = Number(n), s = SYM[cur] || ''
  if (short && Math.abs(v) >= 1e6) return s + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'm'
  if (short && Math.abs(v) >= 1e4) return s + Math.round(v / 1e3) + 'k'
  return s + Math.round(v).toLocaleString('en-GB')
}
const priceLine = (p: P) => p.price ? money(p.price, p.currency) + (p.price_is_rent ? '/mo' : '') : (p.price_text || 'Price not set')
const ago = (d: string) => {
  const m = (Date.now() - new Date(d).getTime()) / 6e4
  if (m < 60) return 'Just now'; if (m < 60 * 24) return new Date(d).toDateString() === new Date().toDateString() ? 'Today' : 'Yesterday'
  const days = Math.round(m / 1440); return days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const initials = (n: string) => (n || '?').replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const thumb = (u: string) => /realtyserver/.test(u) ? u + '&thumbnail' : u

async function headers() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
}
async function api(body?: any, query = '') {
  const res = await fetch('/api/client-properties' + query, { method: body ? 'POST' : 'GET', headers: await headers(), body: body ? JSON.stringify(body) : undefined })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || d.error) throw new Error(d.error || 'Something went wrong')
  return d
}
async function upload(file: File, folder: string) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `client-properties/${folder}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('crm-files').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)
  return { url: supabase.storage.from('crm-files').getPublicUrl(path).data.publicUrl, path }
}

// ── icons (line only) ────────────────────────────────────────────────────
const ICO: Record<string, string> = {
  plus: 'M12 5v14M5 12h14', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5', calc: 'M5 3h14v18H5zM8 7h8M8 12h2M14 12h2M8 16h2M14 16h2',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  check: 'M5 12l5 5 9-10', phone: 'M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  mail: 'M4 4h16v16H4zM4 6l8 7 8-7', file: 'M14 3H6v18h12V7zM14 3v4h4', up: 'M12 19V5M6 11l6-6 6 6', cal: 'M4 5h16v16H4zM4 9h16M9 3v4M15 3v4',
  msg: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z', link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6', close: 'M18 6L6 18M6 6l12 12', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5', star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', x: 'M18 6L6 18M6 6l12 12',
}
const Icon = ({ k, s = 15, c = 'currentColor' }: { k: string; s?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}><path d={ICO[k]} /></svg>
const KIND_ICON: Record<string, string> = { note: 'msg', call: 'phone', viewing: 'cal', offer: 'star', numbers: 'calc', import: 'link', created: 'plus', stage: 'right', service: 'edit', photos: 'up', document: 'file', signed: 'check' }

const Pill = ({ s }: { s: string }) => { const t = ST[s] || ST.new; return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: t.bg, color: t.c, whiteSpace: 'nowrap' }}>{t.l}</span> }
const card: React.CSSProperties = { background: '#fff', border: '1px solid ' + C.row, borderRadius: 10 }
const dark = (extra?: React.CSSProperties): React.CSSProperties => ({ ...btn('ghost'), background: INK, color: '#fff', border: '1px solid ' + INK, borderRadius: 8, fontWeight: 600, ...extra })
const ghost = (extra?: React.CSSProperties): React.CSSProperties => ({ ...btn('ghost'), borderRadius: 8, fontWeight: 600, fontSize: 13, ...extra })
const chip = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, border: '1px solid ' + (on ? INK : C.row), background: on ? INK : '#fff', color: on ? '#fff' : '#344054', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' })

// ═════════════════════════════════════════════════════════════════════════
export default function ClientProperties() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    const read = () => setId(new URLSearchParams(window.location.search).get('id'))
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read)
  }, [])
  const open = (pid: string | null) => { window.history.pushState(null, '', pid ? `?id=${pid}` : window.location.pathname); setId(pid); window.scrollTo(0, 0) }
  return id ? <Detail id={id} back={() => open(null)} /> : <List open={open} />
}

// ── List ─────────────────────────────────────────────────────────────────
function List({ open }: { open: (id: string) => void }) {
  const [rows, setRows] = useState<P[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('all')
  const [service, setService] = useState('')
  const [parish, setParish] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { api().then(d => setRows(d.properties)).catch(e => setErr(e.message)) }, [])
  const count = (k: string) => (rows || []).filter(r => r.stage === k).length
  const parishes = useMemo(() => [...new Set((rows || []).map(r => r.area).filter(Boolean))].sort(), [rows])
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)
  const signedMonth = (rows || []).filter(r => r.stage === 'signed' && r.signed_at && new Date(r.signed_at) >= month).length
  const pipeline = (rows || []).filter(r => !['signed', 'passed'].includes(r.stage) && r.price && !r.price_is_rent)
  const pipeCur = pipeline[0]?.currency || 'JMD'
  const pipeVal = pipeline.filter(r => r.currency === pipeCur).reduce((a, r) => a + Number(r.price), 0)
  const shown = (rows || []).filter(r => (stage === 'all' || r.stage === stage) && (!service || r.service === service) && (!parish || r.area === parish)
    && (!q || [r.address, r.subarea, r.area, r.owner_name, r.referred_by, r.mls, r.owner_phone, r.owner_email].join(' ').toLowerCase().includes(q.toLowerCase())))

  return (
    <CrmPage>
      <CrmHeader title="Client Properties" subtitle="Every property a client brings to us — details, photos, owner, numbers and where it stands."
        actions={<button style={dark()} onClick={() => setAdding(true)}><Icon k="plus" />Add property</button>} />
      <Body>
        {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
        {!rows ? <Loading /> : <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
            {STAGES.slice(0, 4).map(s => <Stat key={s.k} label={s.l} value={<span style={{ color: s.c }}>{count(s.k)}</span>} />)}
            <Stat label="Signed this month" value={<span style={{ color: ST.signed.c }}>{signedMonth}</span>} />
            <Stat label="Pipeline value" value={pipeVal ? money(pipeVal, pipeCur, true) : '—'} sub="Asking prices still open" highlight />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
              <span style={{ position: 'absolute', left: 10, top: 9, color: C.faint }}><Icon k="search" /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search address, owner, MLS#" style={{ ...input, paddingLeft: 32, borderRadius: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={chip(stage === 'all')} onClick={() => setStage('all')}>All <span style={{ opacity: .6 }}>{rows.length}</span></button>
              {STAGES.map(s => <button key={s.k} style={chip(stage === s.k)} onClick={() => setStage(s.k)}>{s.l}{count(s.k) ? <span style={{ opacity: .6 }}> {count(s.k)}</span> : null}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <select value={service} onChange={e => setService(e.target.value)} style={{ ...input, width: 'auto', borderRadius: 8 }}><option value="">All services</option>{SERVICES.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}</select>
              <select value={parish} onChange={e => setParish(e.target.value)} style={{ ...input, width: 'auto', borderRadius: 8 }}><option value="">All parishes</option>{parishes.map(p => <option key={p}>{p}</option>)}</select>
            </div>
          </div>
          {shown.length === 0 ? <Empty>{rows.length === 0 ? <>No client properties yet. Press <b>Add property</b> when an owner brings one to you — paste the agent’s listing link and the photos and details come in.</> : 'No properties match.'}</Empty> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: 16 }}>
              {shown.map(p => <PropCard key={p.id} p={p} onClick={() => open(p.id)} />)}
            </div>
          )}
        </>}
      </Body>
      {adding && <PropertyForm onClose={() => setAdding(false)} onSaved={p => { setAdding(false); setRows(r => [p, ...(r || [])]); open(p.id) }} />}
    </CrmPage>
  )
}

function PropCard({ p, onClick }: { p: P; onClick: () => void }) {
  const n = p.numbers
  const photo = (p.photos || [])[0]
  const spec = [p.bedrooms != null && `${+p.bedrooms} bed`, p.bathrooms != null && `${+p.bathrooms} bath`, p.style].filter(Boolean).join(' · ')
  return (
    <div onClick={onClick} style={{ ...card, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(25,24,21,.10)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ position: 'relative', height: 160, background: photo ? `#E8E4DA url("${thumb(photo)}") center/cover` : '#F3EEE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!photo && <Icon k="home" s={34} c="#CBBF9F" />}
        <div style={{ position: 'absolute', top: 10, left: 10 }}><Pill s={p.stage} /></div>
        {p.service && <span style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(25,24,21,.8)', color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 4 }}>{SV[p.service]}</span>}
        {(p.photos || []).length > 1 && <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(25,24,21,.65)', color: '#fff', fontSize: 11, padding: '3px 7px', borderRadius: 4 }}>{p.photos.length} photos</span>}
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{[p.subarea, p.area].filter(Boolean).join(', ') || ' '}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <b style={{ fontSize: 16, color: INK, whiteSpace: 'nowrap' }}>{priceLine(p)}</b><span style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>{spec}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5 }}>
          <span style={{ width: 26, height: 26, borderRadius: 26, background: '#F1EBDD', color: GOLD_T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{initials(p.owner_name)}</span>
          <div style={{ minWidth: 0 }}><b>{p.owner_name}</b><div style={{ color: C.muted, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.referred_by ? `Came via ${p.referred_by}` : 'Owner'}</div></div>
          <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 11.5, whiteSpace: 'nowrap' }}>{ago(p.updated_at || p.created_at)}</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF0F4', fontSize: 12 }}>
          {n ? <div style={{ display: 'flex', gap: 16 }}>
            {n.monthlyCashflow != null ? <div><div style={{ color: C.muted }}>Cash flow</div><b style={{ color: n.monthlyCashflow >= 0 ? '#0E7C55' : C.red, fontSize: 13.5 }}>{money(n.monthlyCashflow, n.currency, true)}/mo</b></div>
              : <div><div style={{ color: C.muted }}>Profit</div><b style={{ color: (n.profit ?? 0) >= 0 ? '#0E7C55' : C.red, fontSize: 13.5 }}>{money(n.profit, n.currency, true)}</b></div>}
            {n.roi != null && <div><div style={{ color: C.muted }}>ROI</div><b style={{ fontSize: 13.5 }}>{Number(n.roi).toFixed(1)}%</b></div>}
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}><div style={{ color: C.muted }}>Strategy</div><b style={{ fontSize: 12.5 }}>{n.strategyLabel}</b></div>
          </div> : <span style={{ color: C.muted }}>Numbers not run yet</span>}
        </div>
      </div>
    </div>
  )
}

// ── Add / edit form ──────────────────────────────────────────────────────
function PropertyForm({ existing, onClose, onSaved }: { existing?: P; onClose: () => void; onSaved: (p: P) => void }) {
  const [f, setF] = useState<any>(() => existing ? { ...existing } : { currency: 'JMD', country: 'Jamaica', photos: [] })
  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))

  async function doImport() {
    if (!link.trim()) return
    setImporting(true); setErr(''); setImported(null)
    try {
      const res = await fetch('/api/listing-import', { method: 'POST', headers: await headers(), body: JSON.stringify({ url: link.trim() }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not import that link.')
      const l = d.listings[0]
      const rent = /rent/i.test(l.saleOrRent || '')
      setF((x: any) => ({
        ...x, address: l.address, area: l.area, subarea: l.subarea, price: l.price ?? x.price, price_text: l.priceText, currency: l.currency || x.currency,
        price_is_rent: rent, bedrooms: l.bedrooms, bathrooms: l.bathrooms, style: l.style, sqft: l.sqft, lot_sqft: l.lotSqft, lot_acres: l.lotAcres,
        amenities: [l.amenities, l.siteInfluence].filter(Boolean).join(' · ') || null, description: l.description, mls: l.mls, source_url: l.sourceUrl,
        photos: l.photos, agent: l.agent || x.agent, listing: l,
      }))
      setImported(`${l.address}${l.subarea ? ', ' + l.subarea : ''} — ${l.photos.length} photos, ${l.bedrooms ?? '—'} bed, ${l.bathrooms ?? '—'} bath, ${l.priceText || 'no price'}${d.listings.length > 1 ? ` (first of ${d.listings.length} on that link)` : ''}`)
    } catch (e: any) { setErr(e.message) }
    setImporting(false)
  }

  async function save() {
    setSaving(true); setErr('')
    try {
      const d = existing ? await api({ action: 'update', id: existing.id, ...f }) : await api({ action: 'create', ...f, note })
      onSaved(d.property)
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const F = ({ k, l, ph, type = 'text', span }: { k: string; l: string; ph?: string; type?: string; span?: number }) => (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}><label style={label}>{l}</label><input type={type} value={f[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...input, borderRadius: 8 }} /></div>
  )
  return (
    <Modal title={existing ? 'Edit property' : 'Add a client property'} onClose={onClose} width={640}>
      {!existing && <div style={{ marginBottom: 16 }}>
        <label style={label}>Listing link (optional) — MLS / Xposure link from an agent</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doImport() }} placeholder="https://jamaica.xposureapp.com/portal/jamaica/InteractiveLink?…" style={{ ...input, borderRadius: 8, flex: 1, minWidth: 0 }} />
          <button onClick={doImport} disabled={importing || !link.trim()} style={dark({ opacity: importing || !link.trim() ? .6 : 1 })}>{importing ? 'Importing…' : 'Import'}</button>
        </div>
        {imported && <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, color: '#0E7C55', marginTop: 6 }}><Icon k="check" s={14} />{imported}</div>}
      </div>}

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: GOLD_T, margin: '4px 0 8px' }}>OWNER</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {F({ k: 'owner_name', l: 'Owner name *', ph: 'e.g. Mr. Campbell' })}
        {F({ k: 'referred_by', l: 'Came via', ph: 'e.g. Referred by Mel' })}
        {F({ k: 'owner_phone', l: 'Phone', ph: '+1 876…' })}
        {F({ k: 'owner_email', l: 'Email', ph: 'name@email.com', type: 'email' })}
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={label}>What do they want?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{SERVICES.map(s => <button key={s.k} type="button" onClick={() => set('service', f.service === s.k ? null : s.k)} style={chip(f.service === s.k)}>{s.l}</button>)}</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: GOLD_T, margin: '18px 0 8px' }}>PROPERTY</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {F({ k: 'address', l: 'Address *', ph: 'e.g. 71 Denham Farm', span: 3 })}
        {F({ k: 'subarea', l: 'Town', ph: 'e.g. Christiana' })}
        {F({ k: 'area', l: 'Parish', ph: 'e.g. Manchester' })}
        {F({ k: 'country', l: 'Country' })}
        <div><label style={label}>Price</label><div style={{ display: 'flex', gap: 6 }}>
          <select value={f.currency || 'JMD'} onChange={e => set('currency', e.target.value)} style={{ ...input, borderRadius: 8, width: 74 }}>{Object.keys(SYM).map(c => <option key={c}>{c}</option>)}</select>
          <input type="number" value={f.price ?? ''} onChange={e => set('price', e.target.value)} placeholder="0" style={{ ...input, borderRadius: 8 }} /></div></div>
        <div><label style={label}>Price is</label><select value={f.price_is_rent ? 'rent' : 'sale'} onChange={e => set('price_is_rent', e.target.value === 'rent')} style={{ ...input, borderRadius: 8 }}><option value="sale">Asking price (sale)</option><option value="rent">Monthly rent</option></select></div>
        <div><label style={label}>Type</label><select value={f.style || ''} onChange={e => set('style', e.target.value)} style={{ ...input, borderRadius: 8 }}><option value="">—</option>{[...new Set([...(f.style ? [f.style] : []), ...TYPES])].map(t => <option key={t}>{t}</option>)}</select></div>
        {F({ k: 'bedrooms', l: 'Bedrooms', type: 'number' })}
        {F({ k: 'bathrooms', l: 'Bathrooms', type: 'number' })}
        {F({ k: 'sqft', l: 'Floor area (sq ft)', type: 'number' })}
        {F({ k: 'mls', l: 'MLS #' })}
        {F({ k: 'agent', l: 'Listing agent', ph: 'Name · company · phone', span: 2 })}
      </div>
      {!existing && <div style={{ marginTop: 14 }}><label style={label}>Notes</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What they told you, their situation, timings…" style={{ ...input, borderRadius: 8, resize: 'vertical' }} /></div>}
      {existing && <div style={{ marginTop: 14 }}><label style={label}>Description</label><textarea value={f.description || ''} onChange={e => set('description', e.target.value)} rows={4} style={{ ...input, borderRadius: 8, resize: 'vertical' }} /></div>}
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button style={ghost()} onClick={onClose}>Cancel</button>
        <button style={dark({ opacity: saving ? .6 : 1 })} disabled={saving} onClick={save}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Save property'}</button>
      </div>
    </Modal>
  )
}

// ── Detail ───────────────────────────────────────────────────────────────
function Detail({ id, back }: { id: string; back: () => void }) {
  const [p, setP] = useState<P | null>(null)
  const [crmLink, setCrmLink] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(false)
  const [signing, setSigning] = useState(false)
  const load = useCallback(() => api(undefined, `?id=${id}`).then(d => { setP(d.property); setCrmLink(d.crmLink) }).catch(e => setErr(e.message)), [id])
  useEffect(() => { load() }, [load])
  const update = async (patch: any) => { try { const d = await api({ action: 'update', id, ...patch }); setP(d.property); if (!crmLink) load() } catch (e: any) { alert(e.message) } }

  if (err) return <CrmPage><Body><button style={ghost()} onClick={back}>← Client Properties</button><div style={{ color: C.red, marginTop: 16 }}>{err}</div></Body></CrmPage>
  if (!p) return <CrmPage><Loading /></CrmPage>
  const idx = STAGES.findIndex(s => s.k === p.stage)
  const n = p.numbers
  const spec: [string, any][] = ([
    ['Bedrooms', p.bedrooms != null ? +p.bedrooms : null], ['Bathrooms', p.bathrooms != null ? +p.bathrooms : null], ['Type', p.style],
    ['Floor area', p.sqft ? `${Number(p.sqft).toLocaleString('en-GB')} sq ft` : null], ['Lot', p.lot_acres ? `${(+p.lot_acres).toFixed(2)} acres` : p.lot_sqft ? `${Number(p.lot_sqft).toLocaleString('en-GB')} sq ft` : null],
    ['On the MLS', p.listing?.status ? `${p.listing.status}${p.listing.daysOnMarket ? ' · ' + p.listing.daysOnMarket + ' days' : ''}` : null],
  ] as [string, any][]).filter(([, v]) => v != null && v !== '')
  const map = p.listing?.lat ? `https://www.google.com/maps?q=${p.listing.lat},${p.listing.lng}` : `https://www.google.com/maps/search/${encodeURIComponent([p.address, p.subarea, p.area, p.country].filter(Boolean).join(', '))}`

  return (
    <CrmPage>
      <Body style={{ paddingTop: 20 }}>
        <div style={{ fontSize: 13, color: C.muted, display: 'flex', gap: 8 }}><a onClick={back} style={{ cursor: 'pointer', color: C.muted }}>Client Properties</a><span>/</span><span style={{ color: C.ink, fontWeight: 600 }}>{p.address}</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, color: INK, fontWeight: 700 }}>{p.address}</h1><Pill s={p.stage} />
              {p.service && <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: INK, color: '#fff' }}>{SV[p.service]}</span>}
            </div>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 3 }}>{[[p.subarea, p.area].filter(Boolean).join(', '), p.mls && `MLS# ${p.mls}`, `Added ${ago(p.created_at).toLowerCase()}`].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`/invest?client=${p.id}`} style={ghost()}><Icon k="calc" />Run numbers</a>
            {crmLink && <a href={crmLink} style={ghost()}><Icon k="users" />Open in CRM</a>}
            <button style={ghost()} onClick={() => setEditing(true)}><Icon k="edit" />Edit</button>
            {p.stage !== 'signed' && <button style={{ ...btn('gold'), borderRadius: 8, fontWeight: 600 }} onClick={() => setSigning(true)}><Icon k="check" />Mark as signed</button>}
          </div>
        </div>

        {/* stage */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px', marginTop: 16 }}>
          {STAGES.slice(0, 5).map((s, i) => (
            <button key={s.k} onClick={() => s.k === 'signed' ? setSigning(true) : update({ stage: s.k })} title={`Move to ${s.l}`} style={{ flex: 1, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ height: 6, borderRadius: 6, background: p.stage === 'passed' ? '#E4E4E4' : i <= idx ? (p.stage === 'signed' ? '#0E9F6E' : GOLD) : '#EEE8DA' }} />
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: i === idx ? 700 : 500, color: i <= idx && p.stage !== 'passed' ? INK : C.faint }}>{s.l}</div>
            </button>
          ))}
          <button onClick={() => update({ stage: p.stage === 'passed' ? 'new' : 'passed' })} style={{ ...ghost({ fontSize: 12, padding: '5px 10px', marginLeft: 8 }), ...(p.stage === 'passed' ? { background: '#F2F2F2' } : {}) }}>{p.stage === 'passed' ? 'Reopen' : 'Passed'}</button>
        </div>
        {p.converted_to && <div style={{ marginTop: 10, fontSize: 13, color: '#0E7C55' }}>Signed {p.signed_at ? when(p.signed_at) : ''} — now in <a href={p.converted_to === 'pm' ? '/pm' : '/properties'} style={{ color: '#0E7C55', fontWeight: 700 }}>{p.converted_to === 'pm' ? 'Property Management' : 'Vacation Rentals'}</a>.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(380px,100%),1fr))', gap: 16, marginTop: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16, gridColumn: 'span 1', minWidth: 0 }}>
            <Gallery p={p} onPhotos={photos => update({ photos })} />
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Property</div>
                <b style={{ fontSize: 20, color: INK }}>{priceLine(p)} <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>{p.price ? (p.price_is_rent ? 'rent asked' : 'asking') : ''}</span></b>
              </div>
              {spec.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '12px 16px', marginTop: 12 }}>
                {spec.map(([k, v]) => <div key={k}><div style={{ fontSize: 11.5, color: C.muted }}>{k}</div><div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div></div>)}
              </div>}
              {p.amenities && <div style={{ fontSize: 13, marginTop: 12 }}><span style={{ color: C.muted }}>Amenities: </span>{p.amenities}</div>}
              {p.description && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3b3833', margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{p.description}</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                <a href={map} target="_blank" rel="noreferrer" style={ghost({ fontSize: 12, padding: '5px 10px' })}><Icon k="pin" s={13} />Map</a>
                {p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" style={ghost({ fontSize: 12, padding: '5px 10px' })}><Icon k="ext" s={13} />Original listing</a>}
              </div>
            </div>
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Our numbers</div>
                {n && <span style={{ fontSize: 12, color: C.muted }}>{n.strategyLabel} · run {ago(n.at).toLowerCase()} by {n.by}</span>}
                <a href={`/invest?client=${p.id}`} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: GOLD_T, textDecoration: 'none' }}>{n ? 'Run again →' : 'Run numbers in the Deal Analyser →'}</a>
              </div>
              {n ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))', gap: 10, marginTop: 12 }}>
                {([
                  [n.priceLabel || 'Price', money(n.price, n.currency, true), n.priceSub],
                  [n.cashLabel || 'Cash needed', money(n.cashNeeded, n.currency, true), n.cashSub],
                  n.monthlyCashflow != null ? ['Monthly cash flow', money(n.monthlyCashflow, n.currency), n.score ? `${n.score} deal` : ''] : ['Profit', money(n.profit, n.currency, true), n.score ? `${n.score} deal` : ''],
                  ['ROI', n.roi != null ? `${Number(n.roi).toFixed(1)}%` : '—', n.offer ? `Offer the landlord ${money(n.offer, n.currency)}/mo` : 'On cash put in'],
                ] as [string, string, string][]).map(([k, v, s]) => (
                  <div key={k} style={{ padding: '12px 14px', border: '1px solid #EFE4CC', borderRadius: 8, background: '#FFFCF5' }}>
                    <div style={{ fontSize: 11.5, color: C.muted }}>{k}</div><div style={{ fontSize: 19, fontWeight: 800, color: k === 'Monthly cash flow' ? (n.monthlyCashflow >= 0 ? '#0E7C55' : C.red) : k === 'Profit' ? ((n.profit ?? 0) >= 0 ? '#0E7C55' : C.red) : INK, marginTop: 2 }}>{v}</div>{s && <div style={{ fontSize: 11, color: C.muted }}>{s}</div>}
                  </div>
                ))}
              </div> : <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Not run yet. The Deal Analyser opens with this property filled in — save the result back here when you’re done.</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Owner</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 42, background: '#F1EBDD', color: GOLD_T, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{initials(p.owner_name)}</span>
                <div><b style={{ fontSize: 15 }}>{p.owner_name}</b><div style={{ fontSize: 12.5, color: C.muted }}>Owner{p.referred_by ? ` · came via ${p.referred_by}` : ''}</div></div>
              </div>
              <div style={{ display: 'grid', gap: 8, marginTop: 14, fontSize: 13.5 }}>
                {p.owner_phone ? <a href={`tel:${p.owner_phone.replace(/[^\d+]/g, '')}`} style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.ink, textDecoration: 'none' }}><Icon k="phone" c={C.muted} />{p.owner_phone}</a> : null}
                {p.owner_email ? <a href={`mailto:${p.owner_email}`} style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.ink, textDecoration: 'none' }}><Icon k="mail" c={C.muted} />{p.owner_email}</a> : null}
                {!p.owner_phone && !p.owner_email && <span style={{ color: C.muted, fontSize: 12.5 }}>No phone or email yet — press Edit to add them.</span>}
              </div>
              {p.owner_phone && <div style={{ marginTop: 12 }}><TextButton phone={p.owner_phone} name={p.owner_name} /></div>}
              {p.agent && <div style={{ marginTop: 14, padding: '10px 12px', background: '#F7F8FA', borderRadius: 8, fontSize: 12.5 }}><div style={{ color: C.muted }}>Listing agent</div><b>{p.agent}</b></div>}
            </div>
            <Activity p={p} onChange={setP} />
            <Documents p={p} onDocs={documents => update({ documents })} />
            <button onClick={async () => { if (confirm(`Delete ${p.address}? This can’t be undone.`)) { await api({ action: 'delete', id }); back() } }} style={{ ...ghost({ fontSize: 12, color: C.muted, justifySelf: 'start' }) }}><Icon k="trash" s={13} />Delete property</button>
          </div>
        </div>
      </Body>
      {editing && <PropertyForm existing={p} onClose={() => setEditing(false)} onSaved={x => { setP(x); setEditing(false) }} />}
      {signing && <SignModal p={p} onClose={() => setSigning(false)} onDone={(x, link) => { setP(x); setSigning(false); if (link && confirm('Signed. Open it there now?')) window.location.href = link }} />}
    </CrmPage>
  )
}

function Gallery({ p, onPhotos }: { p: P; onPhotos: (photos: string[]) => void }) {
  const photos: string[] = p.photos || []
  const [i, setI] = useState(0)
  const [big, setBig] = useState(false)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const n = photos.length
  const go = useCallback((d: number) => setI(x => (x + d + n) % n), [n])
  useEffect(() => {
    if (!big) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [big, go])
  async function add(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try { const up = await Promise.all([...files].map(f => upload(f, p.id))); onPhotos([...photos, ...up.map(u => u.url)]) } catch (e: any) { alert(e.message) }
    setBusy(false)
  }
  const arrow = (side: 'left' | 'right', s = 34): React.CSSProperties => ({ position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)', width: s, height: s, borderRadius: s, border: 'none', background: 'rgba(25,24,21,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })
  return (
    <div style={{ ...card, overflow: 'hidden', background: INK, border: 'none' }}>
      <input ref={file} type="file" accept="image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
      {n ? <div style={{ position: 'relative', aspectRatio: '16 / 10', cursor: 'zoom-in' }} onClick={() => setBig(true)}>
        <img src={photos[i]} alt={`Photo ${i + 1} of ${p.address}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {n > 1 && <><button aria-label="Previous photo" onClick={e => { e.stopPropagation(); go(-1) }} style={arrow('left')}><Icon k="left" /></button><button aria-label="Next photo" onClick={e => { e.stopPropagation(); go(1) }} style={arrow('right')}><Icon k="right" /></button></>}
        <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(25,24,21,.75)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 4 }}>{i + 1} / {n}</span>
      </div> : <div style={{ aspectRatio: '16 / 10', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', color: '#B9B3A5' }}><Icon k="home" s={40} c="#6b675e" /><span style={{ fontSize: 13 }}>No photos yet</span></div>}
      <div style={{ display: 'flex', gap: 6, padding: 8, overflowX: 'auto' }}>
        {photos.map((u, k) => (
          <div key={k} style={{ position: 'relative', flex: '0 0 auto' }}>
            <button onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} style={{ padding: 0, border: k === i ? `2px solid ${GOLD}` : '2px solid transparent', borderRadius: 4, background: 'none', cursor: 'pointer', opacity: k === i ? 1 : .72, display: 'block' }}>
              <img src={thumb(u)} alt="" loading="lazy" style={{ width: 72, height: 54, objectFit: 'cover', display: 'block', borderRadius: 2 }} />
            </button>
            {k === i && <button title="Remove this photo" onClick={() => { if (confirm('Remove this photo?')) { onPhotos(photos.filter((_, j) => j !== k)); setI(0) } }} style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 18, border: 'none', background: '#fff', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Icon k="x" s={11} /></button>}
          </div>
        ))}
        <button onClick={() => file.current?.click()} disabled={busy} style={{ flex: '0 0 auto', width: 76, height: 58, borderRadius: 4, border: '1px dashed #6b675e', background: 'none', color: '#C8C2B4', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{busy ? 'Uploading…' : '+ Add photos'}</button>
      </div>
      {big && n > 0 && (
        <div onClick={() => setBig(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(12,12,10,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={photos[i]} alt={`Photo ${i + 1}`} onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 4 }} />
          <button aria-label="Close" onClick={() => setBig(false)} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 40, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon k="close" s={20} /></button>
          {n > 1 && <><button aria-label="Previous photo" onClick={e => { e.stopPropagation(); go(-1) }} style={arrow('left', 46)}><Icon k="left" s={22} /></button><button aria-label="Next photo" onClick={e => { e.stopPropagation(); go(1) }} style={arrow('right', 46)}><Icon k="right" s={22} /></button></>}
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: '#E8E4DA', fontSize: 13 }}>{p.address} · {i + 1} / {n}</div>
        </div>
      )}
    </div>
  )
}

function Activity({ p, onChange }: { p: P; onChange: (p: P) => void }) {
  const [text, setText] = useState('')
  const [kind, setKind] = useState('note')
  const [busy, setBusy] = useState(false)
  const [all, setAll] = useState(false)
  const items: any[] = p.activity || []
  async function add() {
    if (!text.trim()) return
    setBusy(true)
    try { const d = await api({ action: 'note', id: p.id, text, kind }); onChange(d.property); setText('') } catch (e: any) { alert(e.message) }
    setBusy(false)
  }
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Activity</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...input, width: 'auto', borderRadius: 8, fontSize: 13 }}><option value="note">Note</option><option value="call">Call</option><option value="viewing">Viewing</option><option value="offer">Offer</option></select>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="What happened?" style={{ ...input, borderRadius: 8, fontSize: 13, flex: 1, minWidth: 0 }} />
        <button onClick={add} disabled={busy || !text.trim()} style={dark({ padding: '6px 12px', fontSize: 13, opacity: busy || !text.trim() ? .6 : 1 })}>Add</button>
      </div>
      <div style={{ marginTop: 6 }}>
        {(all ? items : items.slice(0, 8)).map((a, k) => (
          <div key={k} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: k < items.length - 1 ? '1px solid #F0F1F4' : 'none' }}>
            <span style={{ width: 28, height: 28, borderRadius: 28, background: '#F6F1E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon k={KIND_ICON[a.kind] || 'msg'} s={14} c={GOLD_T} /></span>
            <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.kind === 'call' ? 'Call: ' : a.kind === 'viewing' ? 'Viewing: ' : a.kind === 'offer' ? 'Offer: ' : ''}{a.text}</div><div style={{ fontSize: 11.5, color: C.muted }}>{a.by} · {when(a.at)}</div></div>
          </div>
        ))}
        {items.length > 8 && <button onClick={() => setAll(!all)} style={{ border: 'none', background: 'none', color: GOLD_T, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', padding: '8px 0 0', fontFamily: 'inherit' }}>{all ? 'Show less' : `Show all ${items.length}`}</button>}
      </div>
    </div>
  )
}

function Documents({ p, onDocs }: { p: P; onDocs: (d: any[]) => void }) {
  const docs: any[] = p.documents || []
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const size = (b: number) => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB'
  async function add(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try { const up = await Promise.all([...files].map(async f => ({ name: f.name, size: f.size, at: new Date().toISOString(), ...(await upload(f, p.id + '/docs')) }))); onDocs([...docs, ...up]) } catch (e: any) { alert(e.message) }
    setBusy(false)
  }
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <input ref={file} type="file" multiple hidden onChange={e => { add(e.target.files); e.target.value = '' }} />
      <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ fontSize: 15, fontWeight: 700 }}>Documents</div>
        <button onClick={() => file.current?.click()} disabled={busy} style={ghost({ marginLeft: 'auto', padding: '5px 10px', fontSize: 12 })}><Icon k="up" s={13} />{busy ? 'Uploading…' : 'Upload'}</button></div>
      {docs.length === 0 ? <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>Title, valuation, survey, ID, agreements…</div> : docs.map((d, k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}>
          <Icon k="file" s={16} c={C.muted} /><a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.ink, textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</a>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.muted, whiteSpace: 'nowrap' }}>{d.size ? size(d.size) : ''}</span>
          <button title="Remove" onClick={() => { if (confirm(`Remove ${d.name}?`)) onDocs(docs.filter((_, j) => j !== k)) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.faint, padding: 2 }}><Icon k="x" s={13} /></button>
        </div>
      ))}
    </div>
  )
}

function SignModal({ p, onClose, onDone }: { p: P; onClose: () => void; onDone: (p: P, link: string | null) => void }) {
  const suggest = p.service === 'airbnb' ? 'vr' : ['guaranteed_rent', 'partnership', 'long_let'].includes(p.service) ? 'pm' : 'none'
  const [to, setTo] = useState(suggest)
  const [busy, setBusy] = useState(false)
  const opts = [
    { k: 'pm', l: 'Add to Property Management', s: 'Creates the property and the owner as a landlord — for guaranteed rent, partnership management and long lets.' },
    { k: 'vr', l: 'Add to Vacation Rentals', s: 'Creates it as a short-let property (set to Inactive, not on the website) for Airbnb management.' },
    { k: 'none', l: 'Just mark it signed', s: 'For sales, or if you’ll set it up yourself later.' },
  ]
  return (
    <Modal title={`Signed — ${p.address}`} onClose={onClose} width={520}>
      <div style={{ display: 'grid', gap: 8 }}>
        {opts.map(o => (
          <label key={o.k} style={{ display: 'flex', gap: 10, padding: '12px 14px', border: '1px solid ' + (to === o.k ? GOLD : C.row), background: to === o.k ? '#FFFCF5' : '#fff', borderRadius: 8, cursor: 'pointer' }}>
            <input type="radio" checked={to === o.k} onChange={() => setTo(o.k)} style={{ marginTop: 3, accentColor: GOLD }} />
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{o.l}{o.k === suggest && <span style={{ fontSize: 11, color: GOLD_T, fontWeight: 700, marginLeft: 8 }}>SUGGESTED</span>}</div><div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{o.s}</div></div>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button style={ghost()} onClick={onClose}>Cancel</button>
        <button style={{ ...btn('gold'), borderRadius: 8, fontWeight: 600, opacity: busy ? .6 : 1 }} disabled={busy} onClick={async () => {
          setBusy(true)
          try { const d = await api({ action: 'convert', id: p.id, to }); onDone(d.property, d.link) } catch (e: any) { alert(e.message); setBusy(false) }
        }}>{busy ? 'Saving…' : 'Mark as signed'}</button>
      </div>
    </Modal>
  )
}
