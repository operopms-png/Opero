import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller, encrypt, decrypt, type Caller } from '@/lib/mailbox'
import { sendEmail } from '@/lib/send-email'
import { tuyaDevices, tuyaStatus, tuyaStream, kindForCategory, lockInfo, TUYA_REGIONS, type TuyaCreds } from '@/lib/tuya'

// Smart Home (Staff Centre): cameras + smart locks grouped by location.
// Two locks on every location:
//   1. access   — admins choose which staff / teams can see each location
//   2. one-time code — even permitted staff must enter a 6-digit code emailed
//      to them; it unlocks that location for VIEW_MINUTES, then locks again.
// Live stream URLs are only ever handed out to someone with a valid unlock.
//   GET                                   -> locations I can see, devices, my unlocks, activity (+ setup for admins)
//   POST request_code | verify_code | lock | stream
//   POST (admins) save_connection | sync | save_location | delete_location | save_device | delete_device
export const dynamic = 'force-dynamic'
export const maxDuration = 30
const VIEW_MINUTES = 30
const CODE_MINUTES = 10
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const PEPPER = process.env.MAILBOX_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'smart-home'
const hash = (code: string, loc: string, email: string) => crypto.createHmac('sha256', PEPPER).update(`${loc}:${email}:${code}`).digest('hex')
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function canSee(loc: any, c: Caller) {
  if (loc.business_id !== c.businessId) return false
  if (c.isAdmin) return true
  if ((loc.access ?? []).map((x: string) => x.toLowerCase()).includes(c.email)) return true
  return !!c.role && (loc.access_teams ?? []).map((x: string) => x.toLowerCase()).includes(c.role.toLowerCase())
}
async function log(c: Caller, action: string, detail: string, location_id?: string | null, device_id?: string | null) {
  await serviceClient.from('smart_activity').insert({ business_id: c.businessId, user_email: c.email, action, detail: detail.slice(0, 500), location_id: location_id ?? null, device_id: device_id ?? null })
}
async function tuyaCreds(biz: string): Promise<TuyaCreds | null> {
  const { data } = await serviceClient.from('smart_connections').select('*').eq('business_id', biz).eq('provider', 'tuya').maybeSingle()
  if (!data?.access_id || !data.secret_enc) return null
  return { region: data.region || 'us', accessId: data.access_id, secret: decrypt(data.secret_enc) }
}
async function unlockedUntil(c: Caller, locationId: string) {
  const { data } = await serviceClient.from('smart_grants').select('expires_at').eq('location_id', locationId).eq('user_email', c.email).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(1)
  return data?.[0]?.expires_at as string | undefined
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const [locs, devs, grants] = await Promise.all([
    serviceClient.from('smart_locations').select('*').eq('business_id', c.businessId).order('sort').order('name'),
    serviceClient.from('smart_devices').select('id,location_id,kind,provider,name,category,online,battery,locked,last_seen,app_url,stream_url,external_id,sort').eq('business_id', c.businessId).order('sort').order('name'),
    serviceClient.from('smart_grants').select('location_id,expires_at').eq('business_id', c.businessId).eq('user_email', c.email).gt('expires_at', new Date().toISOString()),
  ])
  const visible = (locs.data ?? []).filter(l => canSee(l, c))
  const ids = new Set(visible.map(l => l.id))
  const unlocked: Record<string, string> = {}
  for (const g of grants.data ?? []) if (!unlocked[g.location_id] || g.expires_at > unlocked[g.location_id]) unlocked[g.location_id] = g.expires_at
  const devices = (devs.data ?? []).filter(d => c.isAdmin || (d.location_id && ids.has(d.location_id))).map(d => ({ ...d, has_stream: !!(d.stream_url || (d.provider === 'tuya' && d.external_id)), stream_url: undefined, external_id: c.isAdmin ? d.external_id : undefined }))
  let actQ = serviceClient.from('smart_activity').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(150)
  if (!c.isAdmin) actQ = actQ.in('location_id', visible.length ? [...ids] : ['00000000-0000-0000-0000-000000000000'])
  const { data: activity } = await actQ
  const out: any = { isAdmin: c.isAdmin, me: c.email, viewMinutes: VIEW_MINUTES, locations: visible.map(({ access, access_teams, ...l }) => c.isAdmin ? { ...l, access, access_teams } : l), devices, unlocked, activity: activity ?? [] }
  if (c.isAdmin) {
    const [{ data: conn }, { data: team }, { data: props }] = await Promise.all([
      serviceClient.from('smart_connections').select('provider,region,access_id,status,last_error,last_synced_at').eq('business_id', c.businessId),
      serviceClient.from('team_members').select('name,email,role').eq('user_id', c.businessId).order('name'),
      serviceClient.from('estate_properties').select('id,name').eq('user_id', c.businessId).order('name'),
    ])
    out.connections = (conn ?? []).map(x => ({ ...x, access_id: x.access_id ? x.access_id.slice(0, 4) + '••••' + x.access_id.slice(-3) : null }))
    out.team = team ?? []; out.properties = props ?? []; out.regions = Object.entries(TUYA_REGIONS).map(([k, v]) => ({ k, l: v.label }))
  }
  return NextResponse.json(out)
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')
  const loadLoc = async (id: string) => {
    const { data } = await serviceClient.from('smart_locations').select('*').eq('id', id).maybeSingle()
    return data && canSee(data, c) ? data : null
  }

  // ---------- one-time code ----------
  if (action === 'request_code') {
    const loc = await loadLoc(b.location_id)
    if (!loc) return bad('You don’t have access to this location', 403)
    const since = new Date(Date.now() - 15 * 60_000).toISOString()
    const { count } = await serviceClient.from('smart_otps').select('id', { count: 'exact', head: true }).eq('location_id', loc.id).eq('user_email', c.email).gte('created_at', since)
    if ((count ?? 0) >= 5) return bad('Too many codes requested — wait a few minutes and try again.', 429)
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    await serviceClient.from('smart_otps').insert({ business_id: c.businessId, location_id: loc.id, user_email: c.email, code_hash: hash(code, loc.id, c.email), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString() })
    try {
      await sendEmail(c.email, `Your Smart Home code: ${code}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338"><p>Your one-time code to view <b>${esc(loc.name)}</b> is:</p><p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#624920;margin:10px 0">${code}</p><p>It expires in ${CODE_MINUTES} minutes and unlocks this location for ${VIEW_MINUTES} minutes. If you didn’t ask for it, tell an admin straight away.</p></div>`)
    } catch { return bad('Couldn’t send the code email — try again.', 502) }
    await log(c, 'code_sent', `One-time code emailed for ${loc.name}`, loc.id)
    return NextResponse.json({ ok: true, sentTo: c.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2'), minutes: CODE_MINUTES })
  }

  if (action === 'verify_code') {
    const loc = await loadLoc(b.location_id)
    if (!loc) return bad('You don’t have access to this location', 403)
    const code = String(b.code || '').replace(/\D/g, '')
    const { data: otp } = await serviceClient.from('smart_otps').select('*').eq('location_id', loc.id).eq('user_email', c.email).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!otp) return bad('That code has expired — request a new one.')
    if (otp.attempts >= 5) return bad('Too many wrong attempts — request a new code.')
    if (!code || !crypto.timingSafeEqual(Buffer.from(hash(code, loc.id, c.email)), Buffer.from(otp.code_hash))) {
      await serviceClient.from('smart_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
      await log(c, 'code_failed', `Wrong code for ${loc.name}`, loc.id)
      return bad(`That code isn’t right${otp.attempts + 1 < 5 ? ` — ${5 - otp.attempts - 1} tries left` : ''}.`)
    }
    const until = new Date(Date.now() + VIEW_MINUTES * 60_000).toISOString()
    await serviceClient.from('smart_otps').update({ used_at: new Date().toISOString() }).eq('id', otp.id)
    await serviceClient.from('smart_grants').insert({ business_id: c.businessId, location_id: loc.id, user_email: c.email, expires_at: until })
    await log(c, 'unlocked', `Unlocked ${loc.name} for ${VIEW_MINUTES} minutes`, loc.id)
    return NextResponse.json({ ok: true, until })
  }

  if (action === 'lock') {
    await serviceClient.from('smart_grants').update({ expires_at: new Date().toISOString() }).eq('location_id', b.location_id).eq('user_email', c.email).gt('expires_at', new Date().toISOString())
    return NextResponse.json({ ok: true })
  }

  if (action === 'stream') {
    const { data: dev } = await serviceClient.from('smart_devices').select('*').eq('id', b.device_id).eq('business_id', c.businessId).maybeSingle()
    if (!dev?.location_id) return bad('Camera not found', 404)
    const loc = await loadLoc(dev.location_id)
    if (!loc) return bad('You don’t have access to this location', 403)
    if (!(await unlockedUntil(c, loc.id))) return bad('Enter the one-time code to view this location', 401)
    try {
      let url: string | null = dev.stream_url || null
      if (!url && dev.provider === 'tuya' && dev.external_id) {
        const creds = await tuyaCreds(c.businessId)
        if (!creds) return bad('Tuya isn’t connected yet (Smart Home → Setup).')
        url = await tuyaStream(creds, dev.external_id)
      }
      if (!url) return bad('No live view set up for this camera.')
      await log(c, 'viewed', `Viewed ${dev.name} (${loc.name})`, loc.id, dev.id)
      return NextResponse.json({ url, type: /\.m3u8(\?|$)/i.test(url) || dev.provider === 'tuya' ? 'hls' : /^https?:/.test(url) ? 'page' : 'unknown' })
    } catch (e: any) { return bad(e.message || 'Couldn’t start the live view', 502) }
  }

  // ---------- setup (admins) ----------
  if (!c.isAdmin) return bad('Only admins can change Smart Home setup', 403)

  if (action === 'save_connection') {
    const region = TUYA_REGIONS[b.region] ? b.region : 'us'
    const accessId = String(b.access_id || '').trim(), secret = String(b.secret || '').trim()
    if (!accessId || !secret) return bad('Add the Access ID and Access Secret from your Tuya cloud project')
    let status = 'connected', last_error: string | null = null, found = 0
    try { found = (await tuyaDevices({ region, accessId, secret })).length } catch (e: any) { status = 'error'; last_error = e.message }
    await serviceClient.from('smart_connections').upsert({ business_id: c.businessId, provider: 'tuya', region, access_id: accessId, secret_enc: encrypt(secret), status, last_error }, { onConflict: 'business_id,provider' })
    await log(c, 'setup', `Tuya connection ${status === 'connected' ? `saved (${found} devices found)` : `failed: ${last_error}`}`)
    if (status !== 'connected') return bad(last_error || 'Couldn’t connect to Tuya')
    return NextResponse.json({ ok: true, found })
  }

  if (action === 'sync') {
    const creds = await tuyaCreds(c.businessId)
    if (!creds) return bad('Connect Tuya first')
    try {
      const list = await tuyaDevices(creds)
      let added = 0
      for (const d of list) {
        const kind = kindForCategory(d.category)
        if (!kind) continue
        const patch: any = { business_id: c.businessId, provider: 'tuya', external_id: d.id, kind, category: d.category, online: !!d.online, last_seen: new Date().toISOString() }
        const { data: existing } = await serviceClient.from('smart_devices').select('id').eq('business_id', c.businessId).eq('provider', 'tuya').eq('external_id', d.id).maybeSingle()
        if (kind === 'lock') { try { const li = lockInfo(await tuyaStatus(creds, d.id)); patch.battery = li.battery; patch.locked = li.locked } catch {} }
        if (existing) await serviceClient.from('smart_devices').update(patch).eq('id', existing.id)
        else { await serviceClient.from('smart_devices').insert({ ...patch, name: d.name || (kind === 'camera' ? 'Camera' : 'Lock') }); added++ }
      }
      await serviceClient.from('smart_connections').update({ status: 'connected', last_error: null, last_synced_at: new Date().toISOString() }).eq('business_id', c.businessId).eq('provider', 'tuya')
      await log(c, 'setup', `Synced Tuya: ${list.length} devices, ${added} new`)
      return NextResponse.json({ ok: true, total: list.length, added })
    } catch (e: any) {
      await serviceClient.from('smart_connections').update({ status: 'error', last_error: e.message }).eq('business_id', c.businessId).eq('provider', 'tuya')
      return bad(e.message, 502)
    }
  }

  if (action === 'save_location') {
    const name = String(b.name || '').trim().slice(0, 120)
    if (!name) return bad('Give the location a name')
    const patch = { name, estate_property_id: b.estate_property_id || null, access: (b.access ?? []).map((x: string) => String(x).toLowerCase()), access_teams: b.access_teams ?? [] }
    const q = b.id ? serviceClient.from('smart_locations').update(patch).eq('id', b.id).eq('business_id', c.businessId) : serviceClient.from('smart_locations').insert({ ...patch, business_id: c.businessId })
    const { error } = await q
    if (error) return bad(error.message, 500)
    await log(c, 'setup', `${b.id ? 'Updated' : 'Added'} location ${name} (access: ${patch.access.length} staff, ${patch.access_teams.length} teams)`)
    return NextResponse.json({ ok: true })
  }
  if (action === 'delete_location') {
    await serviceClient.from('smart_devices').update({ location_id: null }).eq('location_id', b.id).eq('business_id', c.businessId)
    await serviceClient.from('smart_locations').delete().eq('id', b.id).eq('business_id', c.businessId)
    await log(c, 'setup', 'Removed a location')
    return NextResponse.json({ ok: true })
  }
  if (action === 'save_device') {
    const name = String(b.name || '').trim().slice(0, 120)
    if (!name) return bad('Give the device a name')
    const provider = ['tuya', 'tapo', 'ring', 'other'].includes(b.provider) ? b.provider : 'other'
    const patch: any = { name, location_id: b.location_id || null, kind: b.kind === 'lock' ? 'lock' : 'camera' }
    if (!b.id || provider !== 'tuya') Object.assign(patch, { provider, stream_url: b.stream_url ? String(b.stream_url).trim() : null, app_url: b.app_url ? String(b.app_url).trim() : null })
    const q = b.id ? serviceClient.from('smart_devices').update(patch).eq('id', b.id).eq('business_id', c.businessId) : serviceClient.from('smart_devices').insert({ ...patch, business_id: c.businessId })
    const { error } = await q
    if (error) return bad(error.message, 500)
    return NextResponse.json({ ok: true })
  }
  if (action === 'delete_device') {
    await serviceClient.from('smart_devices').delete().eq('id', b.id).eq('business_id', c.businessId)
    return NextResponse.json({ ok: true })
  }
  return bad('Unknown action')
}
