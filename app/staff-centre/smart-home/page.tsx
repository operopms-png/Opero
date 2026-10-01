'use client'
// Staff Centre → Smart Home: live cameras and smart locks, grouped by location.
// Each location is protected twice: only staff an admin has chosen can see it,
// and even they must enter a one-time code (emailed to them) to open it — the
// unlock lasts 30 minutes. Admins connect Tuya and set everything up in Setup.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C, CrmPage, CrmHeader, Body, Stat, Pill, Empty, Modal, Loading, btn, input as inp, label as lbl } from '../../../components/crm/Page'
import CameraPlayer from '../../../components/smart-home/CameraPlayer'

async function call(body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/smart-home', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong')
  return data
}
const ago = (d?: string | null) => { if (!d) return '—'; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const PROVIDER: Record<string, string> = { tuya: 'Tuya', tapo: 'Tapo', ring: 'Ring', other: 'Other' }

export default function SmartHomePage() {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'cameras' | 'locks' | 'activity' | 'setup'>('cameras')
  const [otpFor, setOtpFor] = useState<any | null>(null)
  const [full, setFull] = useState<any | null>(null)
  const [toast, setToast] = useState('')
  const [, tick] = useState(0)
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(() => call().then(setD).catch(e => setErr(e.message)), [])
  useEffect(() => { load(); const i = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(i) }, [load])
  const api = useCallback((b: any) => call(b), [])

  const unlockedLeft = (locId: string) => { const u = d?.unlocked?.[locId]; if (!u) return 0; return Math.max(0, Math.ceil((new Date(u).getTime() - Date.now()) / 60000)) }
  const devicesAt = (locId: string, kind: string) => (d?.devices ?? []).filter((x: any) => x.location_id === locId && x.kind === kind)
  const cams = (d?.devices ?? []).filter((x: any) => x.kind === 'camera')
  const locks = (d?.devices ?? []).filter((x: any) => x.kind === 'lock')

  if (err) return <CrmPage><Body><Empty>{err}</Empty></Body></CrmPage>
  if (!d) return <Loading />

  async function relock(loc: any) { await call({ action: 'lock', location_id: loc.id }); await load(); flash(`${loc.name} locked`) }

  const LockedCard = ({ loc, kind }: { loc: any; kind: string }) => (
    <div style={{ border: '1px dashed ' + C.border, borderRadius: 8, padding: '26px 16px', textAlign: 'center', background: '#FAFBFC', marginBottom: 22 }}>
      <div style={{ fontSize: 26 }}>🔒</div>
      <div style={{ fontWeight: 600, margin: '6px 0 4px' }}>{devicesAt(loc.id, kind).length} {kind === 'camera' ? 'camera' : 'lock'}{devicesAt(loc.id, kind).length === 1 ? '' : 's'} at {loc.name}</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Enter a one-time code to view. It unlocks this location for {d.viewMinutes} minutes.</div>
      <button onClick={() => setOtpFor(loc)} style={btn('gold')}>Unlock with one-time code</button>
    </div>
  )
  const LocHead = ({ loc, n, kind }: { loc: any; n: number; kind: string }) => {
    const left = unlockedLeft(loc.id)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: C.goldDark }}>{loc.name}</span>
        <span style={{ fontSize: 13, color: C.faint }}>{n} {kind}{n === 1 ? '' : 's'}</span>
        <div style={{ flex: 1 }} />
        {left > 0 ? <><span style={{ fontSize: 12.5, color: '#00864E', background: '#E7F9F0', borderRadius: 10, padding: '2px 9px' }}>🔓 Unlocked · {left} min left</span><button onClick={() => relock(loc)} style={btn('ghost', true)}>Lock now</button></> : <span style={{ fontSize: 12.5, color: C.muted }}>🔒 Locked</span>}
      </div>
    )
  }

  const camerasTab = () => {
    const locs = d.locations.filter((l: any) => devicesAt(l.id, 'camera').length)
    if (!locs.length) return <Empty>{d.isAdmin ? <>No cameras yet. Go to <b>Setup</b> to connect Tuya, add Tapo or Ring cameras, and put them in locations.</> : 'No cameras have been shared with you yet. Ask an admin for access.'}</Empty>
    return locs.map((loc: any) => {
      const list = devicesAt(loc.id, 'camera')
      return (
        <div key={loc.id} style={{ marginBottom: 26 }}>
          <LocHead loc={loc} n={list.length} kind="camera" />
          {unlockedLeft(loc.id) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {list.map((cam: any) => (
                <div key={cam.id} style={{ border: '1px solid ' + C.row, borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  {cam.provider === 'ring' ? (
                    <div style={{ height: 190, background: '#0d1b2a', color: '#9fb3c8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 12.5, padding: 12, textAlign: 'center' }}>Ring cameras can only be viewed in the Ring app
                      <a href={cam.app_url || 'https://account.ring.com/account/dashboard'} target="_blank" rel="noreferrer" style={{ background: '#1998d5', color: '#fff', borderRadius: 4, padding: '7px 14px', fontWeight: 600, textDecoration: 'none' }}>Open in Ring ↗</a></div>
                  ) : cam.has_stream ? <CameraPlayer deviceId={cam.id} api={api} onFull={() => setFull(cam)} />
                    : <div style={{ height: 190, background: '#1c1c1c', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 12, textAlign: 'center' }}>No live view set up yet{d.isAdmin ? ' — add its stream link in Setup' : ''}</div>}
                  <div style={{ padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><b style={{ fontWeight: 500 }}>{cam.name}</b><br /><small style={{ color: C.faint }}>{PROVIDER[cam.provider] ?? cam.provider}</small></span>
                    {cam.provider === 'ring' ? <Pill width={70} color={C.grey}>App only</Pill> : <Pill width={70} color={cam.online === false ? C.red : C.green}>{cam.online === false ? 'Offline' : 'Online'}</Pill>}
                  </div>
                </div>
              ))}
            </div>
          ) : <LockedCard loc={loc} kind="camera" />}
        </div>
      )
    })
  }

  const locksTab = () => {
    const locs = d.locations.filter((l: any) => devicesAt(l.id, 'lock').length)
    if (!locs.length) return <Empty>{d.isAdmin ? <>No smart locks yet. Tuya / Smart Life locks appear after you connect Tuya in <b>Setup</b> and press <b>Sync devices</b>.</> : 'No locks have been shared with you yet.'}</Empty>
    return locs.map((loc: any) => {
      const list = devicesAt(loc.id, 'lock')
      return (
        <div key={loc.id} style={{ marginBottom: 26 }}>
          <LocHead loc={loc} n={list.length} kind="lock" />
          {unlockedLeft(loc.id) ? (
            <div style={{ border: '1px solid ' + C.row, borderLeft: '6px solid ' + C.green, borderRadius: 4 }}>
              {list.map((lk: any) => (
                <div key={lk.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.4fr) 130px 160px 1fr', alignItems: 'center', borderBottom: '1px solid ' + C.row }}>
                  <div style={{ padding: '10px 12px' }}><b style={{ fontWeight: 500 }}>{lk.name}</b><br /><small style={{ color: C.faint }}>{PROVIDER[lk.provider] ?? lk.provider} smart lock</small></div>
                  <div style={{ padding: '10px 12px' }}><Pill width={96} color={lk.online === false ? C.red : lk.locked === false ? C.orange : lk.locked ? C.green : C.grey}>{lk.online === false ? 'Offline' : lk.locked === false ? 'Unlocked' : lk.locked ? 'Locked' : 'Unknown'}</Pill></div>
                  <div style={{ padding: '10px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>{lk.battery == null ? <span style={{ color: C.faint }}>Battery —</span> : <><span style={{ width: 60, height: 8, borderRadius: 4, background: '#EEF0F4', overflow: 'hidden', display: 'inline-block' }}><span style={{ display: 'block', height: '100%', width: `${lk.battery}%`, background: lk.battery < 25 ? C.orange : C.green }} /></span>{lk.battery}%</>}</div>
                  <div style={{ padding: '10px 12px', fontSize: 13, color: C.muted }}>Last update {ago(lk.last_seen)}</div>
                </div>
              ))}
            </div>
          ) : <LockedCard loc={loc} kind="lock" />}
        </div>
      )
    })
  }

  const activityTab = () => !d.activity.length ? <Empty>No activity yet.</Empty> : (
    <div style={{ border: '1px solid ' + C.row, borderRadius: 6 }}>
      {d.activity.map((a: any) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 220px', gap: 10, padding: '8px 12px', borderBottom: '1px solid #F1F2F6', fontSize: 13.5 }}>
          <span style={{ color: C.faint }}>{when(a.created_at)}</span>
          <span style={{ color: a.action === 'code_failed' ? C.red : C.ink }}>{a.action === 'code_failed' ? '⚠ ' : a.action === 'unlocked' ? '🔓 ' : a.action === 'viewed' ? '👁 ' : ''}{a.detail}</span>
          <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.user_email}</span>
        </div>
      ))}
    </div>
  )

  const tabs = [{ k: 'cameras', l: 'Cameras', count: cams.length }, { k: 'locks', l: 'Locks', count: locks.length }, { k: 'activity', l: 'Activity' }, ...(d.isAdmin ? [{ k: 'setup', l: 'Setup' }] : [])]
  const tuyaConn = (d.connections ?? []).find((x: any) => x.provider === 'tuya')
  return (
    <CrmPage>
      <CrmHeader title="Smart Home" subtitle="Live cameras and smart locks across your properties. Each location needs a one-time code (emailed to you) to open, and only staff given access can see it." tabs={tabs} tab={tab} onTab={k => setTab(k as any)} />
      <Body>
        {tab !== 'setup' && tab !== 'activity' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 22 }}>
            {tab === 'cameras' ? <>
              <Stat label="Cameras online" value={`${cams.filter((x: any) => x.online !== false && x.provider !== 'ring').length} / ${cams.length}`} highlight />
              <Stat label="Offline" value={<span style={{ color: cams.some((x: any) => x.online === false) ? C.red : C.ink }}>{cams.filter((x: any) => x.online === false).length}</span>} />
              <Stat label="Locations" value={d.locations.filter((l: any) => devicesAt(l.id, 'camera').length).length} />
              <Stat label="Unlocked now" value={Object.keys(d.unlocked).filter(k => unlockedLeft(k)).length} />
            </> : <>
              <Stat label="Locks" value={locks.length} highlight />
              <Stat label="Low battery" value={<span style={{ color: locks.some((x: any) => x.battery != null && x.battery < 25) ? C.orange : C.ink }}>{locks.filter((x: any) => x.battery != null && x.battery < 25).length}</span>} />
              <Stat label="Unlocked doors" value={locks.filter((x: any) => x.locked === false).length} />
              <Stat label="Offline" value={locks.filter((x: any) => x.online === false).length} />
            </>}
          </div>
        )}
        {tab === 'cameras' && camerasTab()}
        {tab === 'locks' && locksTab()}
        {tab === 'activity' && activityTab()}
        {tab === 'setup' && d.isAdmin && <Setup d={d} reload={load} flash={flash} tuyaConn={tuyaConn} />}
      </Body>

      {otpFor && <OtpModal loc={otpFor} viewMinutes={d.viewMinutes} onClose={() => setOtpFor(null)} onDone={async () => { setOtpFor(null); await load(); flash(`${otpFor.name} unlocked for ${d.viewMinutes} minutes`) }} />}
      {full && (
        <div onClick={e => e.target === e.currentTarget && setFull(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setFull(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>×</button>
          <div style={{ width: 'min(1200px, 95vw)' }}><CameraPlayer deviceId={full.id} api={api} height="min(70vh, 675px)" /></div>
          <div style={{ color: '#fff', marginTop: 10, fontSize: 14 }}>{full.name}</div>
        </div>
      )}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13.5, zIndex: 95 }}>{toast}</div>}
    </CrmPage>
  )
}

function OtpModal({ loc, viewMinutes, onClose, onDone }: { loc: any; viewMinutes: number; onClose: () => void; onDone: () => void }) {
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function send() { setBusy(true); setErr(''); try { const r = await call({ action: 'request_code', location_id: loc.id }); setSent(r.sentTo) } catch (e: any) { setErr(e.message) } setBusy(false) }
  async function verify() { setBusy(true); setErr(''); try { await call({ action: 'verify_code', location_id: loc.id, code }); onDone() } catch (e: any) { setErr(e.message) } setBusy(false) }
  useEffect(() => { send() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal title={`Unlock ${loc.name}`} onClose={onClose} width={440}>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>
        {sent ? <>We’ve emailed a 6-digit code to <b style={{ color: C.ink }}>{sent}</b>. It expires in 10 minutes. Once entered, {loc.name} stays unlocked for {viewMinutes} minutes.</> : busy ? 'Sending your code…' : 'We’ll email you a one-time code.'}
      </div>
      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => e.key === 'Enter' && code.length === 6 && verify()} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="••••••"
        style={{ ...inp, fontSize: 28, letterSpacing: 10, textAlign: 'center', padding: '10px', fontFamily: 'ui-monospace, Menlo, monospace' }} />
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button onClick={send} disabled={busy} style={{ border: 'none', background: 'none', color: C.goldDark, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>Send a new code</button>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={btn('ghost')}>Cancel</button>
        <button onClick={verify} disabled={busy || code.length !== 6} style={{ ...btn('gold'), opacity: busy || code.length !== 6 ? 0.6 : 1 }}>Unlock</button>
      </div>
    </Modal>
  )
}

// ---------- Setup (admins) ----------
function Setup({ d, reload, flash, tuyaConn }: any) {
  const [conn, setConn] = useState({ region: tuyaConn?.region || 'us', access_id: '', secret: '' })
  const [busy, setBusy] = useState('')
  const [editLoc, setEditLoc] = useState<any | null>(null)
  const [editDev, setEditDev] = useState<any | null>(null)
  const roles = useMemo(() => Array.from(new Set((d.team ?? []).map((t: any) => t.role).filter(Boolean))) as string[], [d.team])
  const run = async (key: string, body: any, ok: string) => { setBusy(key); try { const r = await call(body); flash(typeof ok === 'function' ? (ok as any)(r) : ok); await reload(); return r } catch (e: any) { flash(e.message) } finally { setBusy('') } }
  const locName = (id: string) => d.locations.find((l: any) => l.id === id)?.name
  const section = (t: string, sub?: string) => <div style={{ margin: '6px 0 10px' }}><div style={{ fontSize: 17, fontWeight: 600, color: C.brown }}>{t}</div>{sub && <div style={{ fontSize: 13, color: C.muted }}>{sub}</div>}</div>

  return (
    <div>
      {section('1. Connect Tuya (Smart Life)', 'Brings in your Tuya cameras and Tuya smart locks automatically.')}
      <div style={{ border: '1px solid ' + C.row, borderLeft: '6px solid ' + C.gold, borderRadius: 4, padding: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pill width={110} color={tuyaConn?.status === 'connected' ? C.green : tuyaConn?.status === 'error' ? C.red : C.grey}>{tuyaConn?.status === 'connected' ? 'Connected' : tuyaConn?.status === 'error' ? 'Needs attention' : 'Not connected'}</Pill>
          {tuyaConn?.access_id && <span style={{ fontSize: 13, color: C.muted }}>Access ID {tuyaConn.access_id}{tuyaConn.last_synced_at ? ` · synced ${ago(tuyaConn.last_synced_at)}` : ''}</span>}
          {tuyaConn?.last_error && <span style={{ fontSize: 12.5, color: C.red }}>{tuyaConn.last_error}</span>}
          <div style={{ flex: 1 }} />
          {tuyaConn?.status === 'connected' && <button onClick={() => run('sync', { action: 'sync' }, ((r: any) => `Synced — ${r.total} devices, ${r.added} new`) as any)} disabled={busy === 'sync'} style={btn('gold', true)}>{busy === 'sync' ? 'Syncing…' : 'Sync devices'}</button>}
        </div>
        <ol style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: '0 0 12px', paddingLeft: 18 }}>
          <li>Sign up at <a href="https://iot.tuya.com" target="_blank" rel="noreferrer" style={{ color: C.goldDark }}>iot.tuya.com</a> (use your Smart Life login).</li>
          <li>Cloud → <b>Create Cloud Project</b>; choose the data centre that matches your app account; add the <b>IoT Video Live Stream</b> service.</li>
          <li>In the project: Devices → <b>Link App Account</b> → scan the QR code with the Smart Life app.</li>
          <li>Copy the project’s <b>Access ID</b> and <b>Access Secret</b> here.</li>
        </ol>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div><label style={lbl}>Data centre</label><select value={conn.region} onChange={e => setConn({ ...conn, region: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>{d.regions.map((r: any) => <option key={r.k} value={r.k}>{r.l}</option>)}</select></div>
          <div><label style={lbl}>Access ID / Client ID</label><input value={conn.access_id} onChange={e => setConn({ ...conn, access_id: e.target.value })} style={inp} autoComplete="off" /></div>
          <div><label style={lbl}>Access Secret</label><input type="password" value={conn.secret} onChange={e => setConn({ ...conn, secret: e.target.value })} style={inp} autoComplete="new-password" /></div>
          <button onClick={() => run('conn', { action: 'save_connection', ...conn }, 'Tuya connected').then(r => { if (r) setConn(c => ({ ...c, secret: '' })) })} disabled={busy === 'conn' || !conn.access_id || !conn.secret} style={{ ...btn('gold'), opacity: !conn.access_id || !conn.secret ? 0.6 : 1 }}>{busy === 'conn' ? 'Testing…' : 'Save & test'}</button>
        </div>
        <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>The secret is stored encrypted and never shown again.</div>
      </div>

      {section('2. Locations & who can see them', 'Group cameras and locks by location. Only admins and the staff / teams you pick can open a location — and they still need a one-time code each time.')}
      <div style={{ border: '1px solid ' + C.row, borderRadius: 4, marginBottom: 10 }}>
        {d.locations.length === 0 && <div style={{ padding: 14, color: C.muted, fontSize: 13.5 }}>No locations yet.</div>}
        {d.locations.map((l: any) => (
          <div key={l.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 2fr 90px 150px', alignItems: 'center', borderBottom: '1px solid ' + C.row }}>
            <div style={{ padding: '10px 12px', fontWeight: 500 }}>{l.name}</div>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 12.5 }}>
              <span style={{ color: C.muted }}>Admins</span>
              {(l.access_teams ?? []).map((r: string) => <span key={r} style={{ background: C.cream, border: '1px solid ' + C.creamLine, color: C.brown, borderRadius: 10, padding: '1px 7px' }}>{r}</span>)}
              {(l.access ?? []).map((e: string) => <span key={e} style={{ background: C.hover, border: '1px solid ' + C.row, borderRadius: 10, padding: '1px 7px' }}>{d.team.find((t: any) => t.email?.toLowerCase() === e)?.name || e}</span>)}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, padding: '0 8px' }}>{d.devices.filter((x: any) => x.location_id === l.id).length} devices</div>
            <div style={{ display: 'flex', gap: 6, padding: '0 10px' }}><button onClick={() => setEditLoc({ ...l })} style={btn('ghost', true)}>Edit access</button><button onClick={() => confirm(`Remove ${l.name}? Its devices stay, unassigned.`) && run('del', { action: 'delete_location', id: l.id }, 'Location removed')} style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button></div>
          </div>
        ))}
      </div>
      <button onClick={() => setEditLoc({ name: '', estate_property_id: '', access: [], access_teams: [] })} style={{ ...btn('gold', true), marginBottom: 28 }}>+ Add location</button>

      {section('3. Cameras & locks', 'Tuya devices appear here after Sync. Add Tapo cameras with their live link (from a small relay box at the property) and Ring cameras with a link to the Ring app.')}
      <div style={{ border: '1px solid ' + C.row, borderRadius: 4, marginBottom: 10 }}>
        {d.devices.length === 0 && <div style={{ padding: 14, color: C.muted, fontSize: 13.5 }}>No devices yet.</div>}
        {d.devices.map((x: any) => (
          <div key={x.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.2fr) 90px 90px minmax(160px,1fr) 110px', alignItems: 'center', borderBottom: '1px solid ' + C.row, fontSize: 13.5 }}>
            <div style={{ padding: '10px 12px', fontWeight: 500 }}>{x.name}</div>
            <div style={{ color: C.muted }}>{x.kind === 'lock' ? 'Lock' : 'Camera'}</div>
            <div style={{ color: C.muted }}>{PROVIDER[x.provider] ?? x.provider}</div>
            <div style={{ color: x.location_id ? C.ink : C.red }}>{locName(x.location_id) ?? 'Not in a location'}</div>
            <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditDev({ ...x })} style={btn('ghost', true)}>Edit</button>{x.provider !== 'tuya' && <button onClick={() => confirm(`Remove ${x.name}?`) && run('deld', { action: 'delete_device', id: x.id }, 'Removed')} style={{ ...btn('danger', true), padding: '5px 8px' }}>×</button>}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setEditDev({ name: '', kind: 'camera', provider: 'tapo', location_id: '', stream_url: '', app_url: '' })} style={btn('gold', true)}>+ Add Tapo / Ring / other camera</button>

      {editLoc && (
        <Modal title={editLoc.id ? `Edit ${editLoc.name}` : 'Add location'} onClose={() => setEditLoc(null)} width={560}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><label style={lbl}>Name</label><input value={editLoc.name} onChange={e => setEditLoc({ ...editLoc, name: e.target.value })} placeholder="e.g. Seacastle Aurevo" style={inp} /></div>
            <div><label style={lbl}>Property (optional)</label><select value={editLoc.estate_property_id || ''} onChange={e => { const p = d.properties.find((x: any) => x.id === e.target.value); setEditLoc({ ...editLoc, estate_property_id: e.target.value, name: editLoc.name || p?.name || '' }) }} style={{ ...inp, cursor: 'pointer' }}><option value="">—</option>{d.properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl}>Teams who can see it</label><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{roles.map(r => <label key={r} style={{ fontSize: 13.5, display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={editLoc.access_teams.includes(r)} onChange={e => setEditLoc({ ...editLoc, access_teams: e.target.checked ? [...editLoc.access_teams, r] : editLoc.access_teams.filter((x: string) => x !== r) })} />{r}</label>)}</div></div>
            <div><label style={lbl}>Staff who can see it</label><div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid ' + C.row, borderRadius: 4, padding: 8, display: 'grid', gap: 6 }}>{d.team.filter((t: any) => t.email).map((t: any) => { const e = t.email.toLowerCase(); return <label key={e} style={{ fontSize: 13.5, display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={editLoc.access.includes(e)} onChange={ev => setEditLoc({ ...editLoc, access: ev.target.checked ? [...editLoc.access, e] : editLoc.access.filter((x: string) => x !== e) })} />{t.name || e} <span style={{ color: C.faint, fontSize: 12 }}>{t.role}</span></label> })}</div></div>
            <div style={{ fontSize: 12.5, color: C.muted }}>Admins can always see every location. Everyone still needs a one-time code to open it.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button onClick={() => setEditLoc(null)} style={btn('ghost')}>Cancel</button><button onClick={async () => { const r = await run('loc', { action: 'save_location', ...editLoc }, 'Location saved'); if (r) setEditLoc(null) }} style={btn('gold')}>Save</button></div>
          </div>
        </Modal>
      )}
      {editDev && (
        <Modal title={editDev.id ? `Edit ${editDev.name}` : 'Add camera'} onClose={() => setEditDev(null)} width={560}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><label style={lbl}>Name</label><input value={editDev.name} onChange={e => setEditDev({ ...editDev, name: e.target.value })} placeholder="e.g. Front gate" style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Location</label><select value={editDev.location_id || ''} onChange={e => setEditDev({ ...editDev, location_id: e.target.value })} style={{ ...inp, cursor: 'pointer' }}><option value="">Not in a location</option>{d.locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              {editDev.provider !== 'tuya' && <div><label style={lbl}>Brand</label><select value={editDev.provider} onChange={e => setEditDev({ ...editDev, provider: e.target.value })} style={{ ...inp, cursor: 'pointer' }}><option value="tapo">Tapo</option><option value="ring">Ring</option><option value="other">Other</option></select></div>}
            </div>
            {editDev.provider !== 'tuya' && editDev.provider !== 'ring' && <div><label style={lbl}>Live link (HLS .m3u8 or embed page from your relay)</label><input value={editDev.stream_url || ''} onChange={e => setEditDev({ ...editDev, stream_url: e.target.value })} placeholder="https://…/stream.m3u8" style={inp} /><div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Tapo cameras need a small relay box at the property to turn their local feed into a web link. Only shown to staff after they enter a one-time code.</div></div>}
            {editDev.provider === 'ring' && <div><label style={lbl}>Ring link (optional)</label><input value={editDev.app_url || ''} onChange={e => setEditDev({ ...editDev, app_url: e.target.value })} placeholder="https://account.ring.com/…" style={inp} /></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button onClick={() => setEditDev(null)} style={btn('ghost')}>Cancel</button><button onClick={async () => { const r = await run('dev', { action: 'save_device', ...editDev }, 'Saved'); if (r) setEditDev(null) }} style={btn('gold')}>Save</button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
