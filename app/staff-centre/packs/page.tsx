'use client'
// Staff Centre → Marketing → Pack Builder. Build an investment pack (car, property, how the car covers the property),
// name it, move it through its stages and send the investor one private link (/p/…). Every pack is saved.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { staffApi } from '@/lib/staff-api'
import PackView from '@/components/packs/PackView'
import { CrmPage, CrmHeader, Body, Empty, Loading, btn, input, label } from '@/components/crm/Page'
import { STAGES, STAGE_COLOR, cleanPack, stageLabel, type PackData } from '@/lib/pack-calc'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #D9E2F0', borderRadius: 8, padding: 16, marginBottom: 16 }
const head: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#667085', margin: '22px 0 10px' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }
const when = (d: string | null) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
const Stage = ({ k }: { k: string }) => { const c = STAGE_COLOR[k] || STAGE_COLOR.draft; return <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{stageLabel(k)}</span> }

function Num({ l, v, on, step }: { l: string; v: number; on: (n: number) => void; step?: number }) {
  return <div><span style={label}>{l}</span><input style={input} type="number" min={0} step={step ?? 1} value={Number.isFinite(v) ? v : 0} onChange={e => on(Number(e.target.value) || 0)} /></div>
}
function Txt({ l, v, on, wide }: { l: string; v: string; on: (s: string) => void; wide?: boolean }) {
  return <div style={wide ? { gridColumn: '1 / -1' } : undefined}><span style={label}>{l}</span><input style={input} value={v} onChange={e => on(e.target.value)} /></div>
}
// A short list of numbers typed with commas, e.g. 600, 700, 800
function List({ l, v, on }: { l: string; v: number[]; on: (n: number[]) => void }) {
  const [t, setT] = useState(v.join(', '))
  return <div style={{ gridColumn: '1 / -1' }}><span style={label}>{l}</span><input style={input} value={t} onChange={e => setT(e.target.value)} onBlur={() => { const n = t.split(/[ ,]+/).map(x => Number(x.replace(/[^0-9.]/g, ''))).filter(x => Number.isFinite(x) && x > 0).slice(0, 8); on(n); setT(n.join(', ')) }} /></div>
}

function Photos({ urls, onAdd, onRemove, busy }: { urls: string[]; onAdd: (f: File[]) => void; onRemove: (i: number) => void; busy: boolean }) {
  return <div style={{ gridColumn: '1 / -1' }}>
    <span style={label}>Photos ({urls.length}). The first one is the main photo. Add as many as you like.</span>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {urls.map((u, i) => <div key={u + i} style={{ position: 'relative', width: 84, height: 62, borderRadius: 6, overflow: 'hidden', border: '1px solid #D0D5DD' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemove(i)} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(20,38,74,.85)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: '20px', padding: 0 }}>×</button>
      </div>)}
      <label style={{ ...btn('ghost', true), cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Uploading…' : 'Add photos'}
        <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={busy} onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) onAdd(f) }} />
      </label>
    </div>
  </div>
}

export default function PackBuilder() {
  const [packs, setPacks] = useState<any[] | null>(null), [isAdmin, setIsAdmin] = useState(false)
  const [err, setErr] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false)
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null)
  const [cur, setCur] = useState<any>(null)            // the pack being edited (row)
  const [data, setData] = useState<PackData | null>(null), [name, setName] = useState('')
  const [save, setSave] = useState<'' | 'saving' | 'saved'>(''), [up, setUp] = useState('')
  const dirty = useRef(false)

  const load = useCallback(() => staffApi('/api/packs').then((r: any) => { setPacks(r.packs); setIsAdmin(!!r.isAdmin) }).catch(e => setErr(e.message)), [])
  useEffect(() => { load() }, [load])

  const open = async (id: string) => {
    setErr(''); setNote('')
    try { const r: any = await staffApi('/api/packs?id=' + id); dirty.current = false; setCur(r.pack); setName(r.pack.name); setData(r.pack.data); setSave('') } catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('id'); if (id) open(id) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (body: any, ok?: string) => { setBusy(true); setErr(''); setNote(''); try { const r: any = await staffApi('/api/packs', body); if (ok) setNote(ok); await load(); return r } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const newPack = async (from?: string) => { const r = await act({ action: 'create', from }); if (r?.pack) open(r.pack.id) }

  // Save as you type: the name and every figure
  useEffect(() => {
    if (!cur || !data || !dirty.current) return
    setSave('saving')
    const t = setTimeout(async () => {
      try { await staffApi('/api/packs', { action: 'update', id: cur.id, name: name.trim() || undefined, data }); dirty.current = false; setSave('saved'); load() } catch (e: any) { setErr(e.message); setSave('') }
    }, 800)
    return () => clearTimeout(t)
  }, [data, name]) // eslint-disable-line react-hooks/exhaustive-deps
  const edit = (fn: (d: PackData) => PackData) => { dirty.current = true; setData(d => d ? fn(d) : d) }

  const upload = async (files: File[], section: 'car' | 'home') => {
    setUp(section); setErr('')
    try {
      const urls: string[] = []
      for (const f of files) {
        const path = `packs/${Date.now()}-${Math.random().toString(36).slice(2)}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`
        const { error } = await supabase.storage.from('pm-files').upload(path, f, { contentType: f.type })
        if (error) throw new Error(error.message)
        urls.push(supabase.storage.from('pm-files').getPublicUrl(path).data.publicUrl)
      }
      edit(d => ({ ...d, [section]: { ...d[section], photos: [...d[section].photos, ...urls].slice(0, 24) } }) as PackData)
    } catch (e: any) { setErr(e.message) } finally { setUp('') }
  }
  const dropPhoto = (section: 'car' | 'home', i: number) => edit(d => ({ ...d, [section]: { ...d[section], photos: d[section].photos.filter((_, k) => k !== i) } }) as PackData)

  const url = (t: string) => `${window.location.origin}/p/${t}`
  const copy = async (text: string, msg: string) => { try { await navigator.clipboard.writeText(text); setNote(msg) } catch { setNote(text) } }
  const message = (p: any, u: string) => `Hi${p.prepared_for ? ' ' + p.prepared_for : ''}, here is your investment pack. It shows what you put in, the car, the property and how the car covers the rent. This link is private to you.\n\n${u}`

  const flush = async () => { if (cur && data && dirty.current) { await staffApi('/api/packs', { action: 'update', id: cur.id, name: name.trim() || undefined, data }); dirty.current = false } }
  const setStage = async (stage: string, ok?: string) => { try { await flush() } catch (e: any) { return setErr(e.message) } const r = await act({ action: 'stage', id: cur.id, stage }, ok); if (r?.pack) setCur({ ...cur, ...r.pack }) }
  const setActive = async (active: boolean) => { const r = await act({ action: 'active', id: cur.id, active }, active ? 'Link is live again.' : 'Link paused. Anyone opening it sees that it is no longer available.'); if (r?.pack) setCur({ ...cur, ...r.pack }) }

  if (!packs) return err ? <CrmPage><Body><div style={{ color: '#B42318' }}>{err}</div></Body></CrmPage> : <Loading />

  // ---------------- one pack ----------------
  if (cur && data) {
    const live = cur.stage !== 'draft', link = url(cur.token), c = cleanPack(data)
    return (
      <CrmPage>
        <CrmHeader title={name || 'Untitled pack'} subtitle="Change anything below and it saves by itself. The preview at the bottom is what the investor sees." actions={<button style={btn('ghost')} onClick={async () => { try { await flush() } catch {} setCur(null); setData(null); load() }}>Back to all packs</button>} />
        <Body>
          {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
          {note && <div style={{ color: '#067647', marginBottom: 12, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{note}</div>}

          <div style={card}>
            <div style={grid}>
              <div style={{ gridColumn: '1 / -1' }}><span style={label}>Pack name (the investor sees this at the top)</span><input style={{ ...input, fontSize: 16, fontWeight: 600 }} value={name} onChange={e => { dirty.current = true; setName(e.target.value) }} /></div>
              <Txt l="Prepared for" v={c.prepared_for} on={s => edit(d => ({ ...d, prepared_for: s }))} />
              <Num l="Number of investors" v={c.investors} on={n => edit(d => ({ ...d, investors: Math.max(1, n) }))} />
              <Num l="Jamaican dollars to £1" v={c.rate} step={0.01} on={n => edit(d => ({ ...d, rate: n }))} />
              <div><span style={label}>Stage</span><select style={input} value={cur.stage} disabled={busy} onChange={e => setStage(e.target.value, 'Stage updated.')}>{STAGES.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}</select></div>
            </div>
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 8 }}>{STAGES.find(s => s.k === cur.stage)?.hint} {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved.' : ''}</div>
          </div>

          <div style={head}>Send it</div>
          <div style={card}>
            {!live ? <>
              <div style={{ fontSize: 13.5, color: '#475467', marginBottom: 10 }}>This pack is a draft, so its link is not live. Check the preview, then create the link.</div>
              <button style={btn('gold')} disabled={busy} onClick={() => setStage('sent', 'Link created. Copy it or the message below and send it to the investor.')}>Create link and mark Sent</button>
            </> : <>
              <input readOnly style={input} value={link} onFocus={e => e.currentTarget.select()} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button style={btn('gold', true)} onClick={() => copy(link, 'Link copied.')}>Copy link</button>
                <button style={btn('ghost', true)} onClick={() => copy(message(c, link), 'Message copied. Paste it into WhatsApp or a text:\n\n' + message(c, link))}>Copy WhatsApp message</button>
                <a style={btn('ghost', true)} href={`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(message(c, link))}`}>Email it</a>
                <a style={btn('ghost', true)} href={link} target="_blank" rel="noreferrer">Open</a>
                <button style={btn('ghost', true)} disabled={busy} onClick={() => setActive(!cur.active)}>{cur.active ? 'Pause link' : 'Resume link'}</button>
              </div>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 8 }}>{cur.opens ? `Opened ${cur.opens} ${cur.opens === 1 ? 'time' : 'times'}, last ${when(cur.last_opened_at)}.` : 'Not opened yet.'}{cur.active ? '' : ' The link is paused.'} Anyone holding the link can see the pack, so send it only to the investor.</div>
            </>}
          </div>

          <div style={head}>1. The car</div>
          <div style={{ ...card, ...grid }}>
            <Txt wide l="Car" v={c.car.title} on={s => edit(d => ({ ...d, car: { ...d.car, title: s } }))} />
            <Num l="Purchase price (J$)" v={c.car.price_jmd} on={n => edit(d => ({ ...d, car: { ...d.car, price_jmd: n } }))} />
            <Num l="Deposit (%)" v={c.car.deposit_pct} on={n => edit(d => ({ ...d, car: { ...d.car, deposit_pct: n } }))} />
            <Num l="Car earns each week, target (J$)" v={c.car.weekly_jmd} on={n => edit(d => ({ ...d, car: { ...d.car, weekly_jmd: n } }))} />
            <Txt wide l="Note under the price" v={c.car.note} on={s => edit(d => ({ ...d, car: { ...d.car, note: s } }))} />
            <Txt wide l="Photo credit" v={c.car.credit} on={s => edit(d => ({ ...d, car: { ...d.car, credit: s } }))} />
            <Photos urls={c.car.photos} busy={up === 'car'} onAdd={f => upload(f, 'car')} onRemove={i => dropPhoto('car', i)} />
          </div>

          <div style={head}>2. The property</div>
          <div style={{ ...card, ...grid }}>
            <Txt wide l="Property" v={c.home.title} on={s => edit(d => ({ ...d, home: { ...d.home, title: s } }))} />
            <Txt wide l="Details" v={c.home.details} on={s => edit(d => ({ ...d, home: { ...d.home, details: s } }))} />
            <Num l="Rent a month (£)" v={c.home.rent_gbp} on={n => edit(d => ({ ...d, home: { ...d.home, rent_gbp: n } }))} />
            <Num l="Months of rent paid up front" v={c.home.rent_months} on={n => edit(d => ({ ...d, home: { ...d.home, rent_months: n } }))} />
            <Num l="Months of security deposit" v={c.home.deposit_months} on={n => edit(d => ({ ...d, home: { ...d.home, deposit_months: n } }))} />
            <List l="Sublet rent scenarios a month in £, separated by commas" v={c.home.sublet_gbp} on={n => edit(d => ({ ...d, home: { ...d.home, sublet_gbp: n } }))} />
            <Photos urls={c.home.photos} busy={up === 'home'} onAdd={f => upload(f, 'home')} onRemove={i => dropPhoto('home', i)} />
          </div>

          <div style={head}>3. Can the car pay for the property?</div>
          <div style={{ ...card, ...grid }}>
            <Num l="Property rent a month if empty (J$)" v={c.cover.rent_jmd} on={n => edit(d => ({ ...d, cover: { ...d.cover, rent_jmd: n } }))} />
            <Num l="Car finance a month (J$)" v={c.cover.finance_jmd} on={n => edit(d => ({ ...d, cover: { ...d.cover, finance_jmd: n } }))} />
            <List l="Weekly car earnings to test in J$, separated by commas" v={c.cover.weekly_jmd} on={n => edit(d => ({ ...d, cover: { ...d.cover, weekly_jmd: n } }))} />
            <Txt wide l="Small print at the bottom" v={c.footer} on={s => edit(d => ({ ...d, footer: s }))} />
          </div>

          <div style={head}>Preview: what the investor sees</div>
          <div style={{ maxWidth: 620 }}><PackView data={c} name={name} company="NOVOURQ" /></div>
        </Body>
      </CrmPage>
    )
  }

  // ---------------- all packs ----------------
  return (
    <CrmPage>
      <CrmHeader title="Pack Builder" subtitle="Build an investment pack, send the investor one private link and track where it has got to. Every pack is saved." actions={<button style={btn('gold')} disabled={busy} onClick={() => newPack()}>+ New pack</button>} />
      <Body>
        {err && <div style={{ color: '#B42318', marginBottom: 12 }}>{err}</div>}
        {note && <div style={{ color: '#067647', marginBottom: 12 }}>{note}</div>}
        {packs.length === 0 ? <Empty>No packs yet. Press New pack to build your first one.</Empty> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {packs.map(p => { const rn = rename?.id === p.id ? rename : null; return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  {rn ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input autoFocus style={input} value={rn.name} onChange={e => setRename({ id: p.id, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget.nextSibling as HTMLElement | null)?.click() }} />
                      <button style={btn('gold', true)} disabled={busy} onClick={async () => { await act({ action: 'update', id: p.id, name: rn.name }); setRename(null) }}>Save</button>
                      <button style={btn('ghost', true)} onClick={() => setRename(null)}>Cancel</button>
                    </div>
                  ) : <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a onClick={() => open(p.id)} style={{ fontWeight: 700, color: '#1B2F6E', cursor: 'pointer' }}>{p.name}</a>
                      <button type="button" aria-label={`Rename ${p.name}`} title="Rename" onClick={() => setRename({ id: p.id, name: p.name })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667085', fontSize: 13, padding: 0 }}>Rename</button>
                    </div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{p.prepared_for ? `For ${p.prepared_for} · ` : ''}{p.stage === 'draft' ? 'Link not live yet' : p.opens ? `Opened ${p.opens} ${p.opens === 1 ? 'time' : 'times'}, last ${when(p.last_opened_at)}` : `Sent ${when(p.sent_at)}, not opened yet`}{p.stage !== 'draft' && !p.active ? ' · Link paused' : ''}</div>
                  </>}
                </div>
                <Stage k={p.stage} />
                <button style={btn('gold', true)} onClick={() => open(p.id)}>Open</button>
                <button style={btn('ghost', true)} disabled={busy} onClick={() => newPack(p.id)}>Copy</button>
                {isAdmin && <button style={btn('ghost', true)} onClick={() => { if (confirm('Delete this pack? Its link stops working.')) act({ action: 'delete', id: p.id }) }}>Delete</button>}
              </div>
            ) })}
          </div>
        )}
      </Body>
    </CrmPage>
  )
}
