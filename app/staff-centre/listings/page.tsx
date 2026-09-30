'use client'
// Staff Centre → Listings: everything about the public lettings link
// (app.sangstersgroup.com/homes) in one place — which Estate Agency
// properties are showing, their photos/currency/description (same editor as
// Estate Agency → Properties), and the viewing requests tenants send.
import { useEffect, useMemo, useState } from 'react'
import { supabase, getAccountId } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Body, Stat, Pill, Group, Row, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'
import ListingEditor, { parseUrls, type ListingFields } from '../../../components/estate/ListingEditor'
import { money } from '../../../lib/listings-shared'

const HIDDEN = ['rented', 'archived', 'let agreed']
const V_STATUS: Record<string, string> = { Requested: '#FDAB3D', Scheduled: '#579BFC', Completed: '#00C875', Cancelled: '#C4C4C4', 'No Show': '#DF2F4A' }
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ListingsPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'homes' | 'requests'>('homes')
  const [props, setProps] = useState<any[]>([])
  const [views, setViews] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { const q = new URLSearchParams(window.location.search).get('tab'); if (q === 'requests') setTab('requests'); load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const uid = await getAccountId(user)
    const [p, v] = await Promise.all([
      supabase.from('estate_properties').select('*').eq('user_id', uid).order('name'),
      supabase.from('estate_viewings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(300),
    ])
    setProps(p.data ?? []); setViews(v.data ?? []); setLoading(false)
  }

  const byProp = useMemo(() => Object.fromEntries(props.map(p => [p.id, p])), [props])
  const reqCount = (id: string) => views.filter(v => v.property_id === id && v.status === 'Requested').length
  const hidden = (p: any) => HIDDEN.includes(String(p.status || '').toLowerCase())
  const live = props.filter(p => p.listed && !hidden(p))
  const off = props.filter(p => !p.listed && !hidden(p))
  const gone = props.filter(p => hidden(p))
  const openReq = views.filter(v => v.status === 'Requested')

  async function toggle(p: any) {
    const next = !p.listed
    setProps(ps => ps.map(x => x.id === p.id ? { ...x, listed: next } : x))
    const { error } = await supabase.from('estate_properties').update({ listed: next }).eq('id', p.id)
    if (error) { flash(error.message); setProps(ps => ps.map(x => x.id === p.id ? { ...x, listed: !next } : x)) }
    else flash(next ? `${p.name} is now on the listings link` : `${p.name} removed from the listings link`)
  }
  async function save() {
    if (!edit) return
    setSaving(true)
    const patch = { listed: edit.listed, currency: edit.currency || 'JMD', available_from: edit.available_from || null, description: edit.description || null, features: edit.features ?? [], image_urls: edit.image_urls || null, photo_captions: edit.photo_captions ?? {}, rent: edit.rent === '' || edit.rent == null ? null : edit.rent }
    const { error } = await supabase.from('estate_properties').update(patch).eq('id', edit.id)
    setSaving(false)
    if (error) { flash(error.message); return }
    setProps(ps => ps.map(x => x.id === edit.id ? { ...x, ...patch } : x)); setEdit(null); flash('Saved')
  }
  async function updView(v: any, patch: any) {
    setViews(vs => vs.map(x => x.id === v.id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('estate_viewings').update(patch).eq('id', v.id)
    if (error) { flash(error.message); load() }
  }
  const copy = (url: string, what = 'Link') => { navigator.clipboard?.writeText(url); flash(`${what} copied`) }

  if (loading) return <Loading />

  const cols = [{ k: 'n', l: 'Property', w: 'minmax(240px,1.6fr)' }, { k: 'a', l: 'Area', w: 170 }, { k: 'r', l: 'Rent / month', w: 130 }, { k: 's', l: 'Status', w: 120 }, { k: 'l', l: 'On link', w: 100 }, { k: 'p', l: 'Photos', w: 80 }, { k: 'q', l: 'Requests', w: 90 }, { k: 'x', l: '', w: 230 }]
  const propRow = (p: any) => {
    const photos = parseUrls(p.image_urls)
    return <Row key={p.id} cells={[
      <div key="n" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {photos[0] ? <img src={photos[0]} alt="" style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} /> : <span style={{ width: 44, height: 32, borderRadius: 4, background: '#F3E6C8', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏠</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      </div>,
      <span key="a" style={{ fontSize: 13, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address || '—'}</span>,
      <span key="r" style={{ fontWeight: 600, color: C.goldDark }}>{p.rent ? money(Number(p.rent), p.currency || 'JMD') : '—'}</span>,
      <Pill key="s" width={96} color={String(p.status).toLowerCase() === 'available' ? C.green : hidden(p) ? C.grey : '#FDAB3D'}>{p.status || '—'}</Pill>,
      hidden(p) ? <span key="l" style={{ fontSize: 12, color: C.faint }}>Hidden</span> : <Pill key="l" width={70} color={p.listed ? C.green : C.grey} onClick={() => toggle(p)} title="Show or hide on the listings link">{p.listed ? 'On' : 'Off'}</Pill>,
      <span key="p" style={{ fontSize: 13, color: photos.length ? C.ink : C.red }}>{photos.length || 'None'}</span>,
      reqCount(p.id) ? <button key="q" onClick={() => setTab('requests')} style={{ border: 'none', background: '#FFF4E0', color: '#B7791F', borderRadius: 10, padding: '2px 9px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{reqCount(p.id)} new</button> : <span key="q" style={{ color: C.faint }}>—</span>,
      <div key="x" style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setEdit({ ...p, listed: !!p.listed, currency: p.currency || 'JMD', available_from: p.available_from || '', description: p.description || '', features: p.features || [], image_urls: p.image_urls || '', photo_captions: p.photo_captions || {} })} style={btn('gold', true)}>Photos &amp; details</button>
        {p.listed && !hidden(p) && <>
          <button onClick={() => copy(`${origin}/homes/${p.id}`, 'Property link')} style={btn('ghost', true)} title="Copy the link to just this property">Copy</button>
          <a href={`/homes/${p.id}`} target="_blank" rel="noreferrer" style={{ ...btn('ghost', true), textDecoration: 'none' }}>View ↗</a>
        </>}
      </div>,
    ]} />
  }

  const vCols = [{ k: 'n', l: 'Tenant', w: 'minmax(180px,1.2fr)' }, { k: 'p', l: 'Property', w: 'minmax(170px,1fr)' }, { k: 'c', l: 'Contact', w: 230 }, { k: 'w', l: 'Wants', w: 170 }, { k: 'r', l: 'Received', w: 120 }, { k: 't', l: 'Viewing time', w: 200 }, { k: 's', l: 'Status', w: 140 }]
  const viewRow = (v: any) => <Row key={v.id} cells={[
    <div key="n" style={{ minWidth: 0 }}><div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.prospect_name}</div>{v.source && <div style={{ fontSize: 11.5, color: C.faint }}>{v.source}</div>}</div>,
    <span key="p" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{byProp[v.property_id]?.name ?? '—'}</span>,
    <div key="c" style={{ fontSize: 12.5, lineHeight: 1.35, minWidth: 0, textAlign: 'left', width: '100%' }}>{v.prospect_phone && <a href={`tel:${v.prospect_phone}`} style={{ color: C.ink, textDecoration: 'none', display: 'block' }}>📞 {v.prospect_phone}</a>}{v.prospect_email && <a href={`mailto:${v.prospect_email}`} style={{ color: C.goldDark, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.prospect_email}</a>}</div>,
    <span key="w" title={v.notes || ''} style={{ fontSize: 12.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notes || '—'}</span>,
    <span key="r" style={{ fontSize: 12.5, color: C.muted }}>{fmt(v.created_at)}</span>,
    <input key="t" type="datetime-local" value={v.scheduled_at ? new Date(new Date(v.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => updView(v, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null, ...(e.target.value && v.status === 'Requested' ? { status: 'Scheduled' } : {}) })} style={{ ...inp, padding: '4px 6px', fontSize: 12.5 }} title="Set the viewing time — it becomes Scheduled" />,
    <select key="s" value={v.status || 'Requested'} onChange={e => updView(v, { status: e.target.value })} style={{ border: 'none', background: V_STATUS[v.status] ?? C.grey, color: '#fff', fontSize: 12.5, fontWeight: 500, borderRadius: 4, height: 28, padding: '0 8px', cursor: 'pointer', fontFamily: 'inherit', width: 120 }}>{Object.keys(V_STATUS).map(s => <option key={s} style={{ color: C.ink, background: '#fff' }}>{s}</option>)}</select>,
  ]} />

  const byStatus = (s: string[]) => views.filter(v => s.includes(v.status || 'Requested'))
  return (
    <CrmPage>
      <CrmHeader title="Listings" subtitle={<>Homes to rent on your public link. Switch properties on, add photos (tenants swipe through them), and follow up viewing requests. Requests also go into Estate Agency → Viewings and the CRM.</>}
        actions={<>
          <code style={{ fontSize: 12.5, background: '#fff', border: '1px solid ' + C.creamLine, borderRadius: 4, padding: '6px 9px' }}>{origin.replace(/^https?:\/\//, '')}/homes</code>
          <button onClick={() => copy(`${origin}/homes`, 'Listings link')} style={btn('gold')}>Copy link</button>
          <a href="/homes" target="_blank" rel="noreferrer" style={{ ...btn('ghost'), textDecoration: 'none' }}>Open ↗</a>
        </>}
        tabs={[{ k: 'homes', l: 'Properties', count: props.length }, { k: 'requests', l: 'Viewing requests', count: openReq.length, color: openReq.length ? '#FDAB3D' : undefined }]} tab={tab} onTab={k => setTab(k as any)} />
      <Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          <Stat label="On the link" value={live.length} sub={`${live.filter(p => parseUrls(p.image_urls).length).length} with photos`} highlight />
          <Stat label="Available, not listed" value={off.length} />
          <Stat label="New viewing requests" value={openReq.length} />
          <Stat label="Viewings booked" value={views.filter(v => v.status === 'Scheduled').length} />
        </div>

        {tab === 'homes' ? (props.length === 0 ? <Empty>No Estate Agency properties yet. Add them in Estate Agency → Properties.</Empty> : <>
          <Group title="On the listings link" color={C.green} count={live.length} cols={cols}>{live.length ? live.map(propRow) : <div style={{ padding: 14, color: C.muted, fontSize: 13.5, borderLeft: '6px solid ' + C.green }}>Nothing showing yet — switch a property On below.</div>}</Group>
          <Group title="Not listed" color="#FDAB3D" count={off.length} cols={cols}>{off.map(propRow)}</Group>
          {gone.length > 0 && <Group title="Rented or archived (hidden automatically)" color={C.grey} count={gone.length} cols={cols} collapsedDefault>{gone.map(propRow)}</Group>}
        </>) : (views.length === 0 ? <Empty>No viewing requests yet. They appear here when tenants press “Book a viewing” on the link.</Empty> : <>
          <Group title="New requests" color="#FDAB3D" count={byStatus(['Requested']).length} cols={vCols}>{byStatus(['Requested']).map(viewRow)}</Group>
          <Group title="Booked" color="#579BFC" count={byStatus(['Scheduled']).length} cols={vCols}>{byStatus(['Scheduled']).map(viewRow)}</Group>
          <Group title="Done" color={C.grey} count={byStatus(['Completed', 'Cancelled', 'No Show']).length} cols={vCols} collapsedDefault>{byStatus(['Completed', 'Cancelled', 'No Show']).map(viewRow)}</Group>
        </>)}
      </Body>

      {edit && (
        <Modal title={`${edit.name} — photos & details`} width={820} onClose={() => setEdit(null)}>
          <div style={{ marginBottom: 12, maxWidth: 260 }}>
            <label style={lbl}>Monthly rent</label>
            <input type="number" value={edit.rent ?? ''} onChange={e => setEdit((x: any) => ({ ...x, rent: e.target.value }))} style={inp} />
          </div>
          <ListingEditor value={edit as ListingFields} onChange={patch => setEdit((x: any) => ({ ...x, ...patch }))} rentLabel="the rent" propertyId={edit.id} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            <button onClick={() => setEdit(null)} style={btn('ghost')}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btn('gold'), opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13.5, zIndex: 80 }}>{toast}</div>}
    </CrmPage>
  )
}
