// NOVOURQ WhatsApp bridge. Links ONE WhatsApp number (scan the QR code once, like WhatsApp Web) and mirrors it to the portal.
//   - Every private message in or out is posted to the portal (PORTAL_URL/api/whatsapp-mirror/inbound).
//   - The portal sends through this bridge (POST /send), one message at a time with a short pause between, to keep the number safe.
// Use a spare number, not your main one: this is not an official WhatsApp product and WhatsApp can restrict linked numbers.
// Run it on an always-on host (Railway, Fly, a small VPS) with a persistent disk at DATA_DIR. It cannot run on Netlify.
import express from 'express'
import pino from 'pino'
import QRCode from 'qrcode'
import fs from 'node:fs'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'

const PORT = Number(process.env.PORT || 3000)
const SECRET = process.env.BRIDGE_SECRET || ''
const PORTAL = (process.env.PORTAL_URL || '').replace(/\/+$/, '')
const DATA_DIR = process.env.DATA_DIR || './auth'
if (!SECRET || SECRET.length < 16) { console.error('Set BRIDGE_SECRET (copy it from the portal WhatsApp tab).'); process.exit(1) }
if (!PORTAL) { console.error('Set PORTAL_URL, for example https://app.thenovourq.com'); process.exit(1) }

const log = pino({ level: 'warn' })
let sock = null
const state = { status: 'starting', qr: '', phone: '' }

async function toPortal(msg) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(PORTAL + '/api/whatsapp-mirror/inbound', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bridge-secret': SECRET }, body: JSON.stringify(msg) })
      if (r.ok) return
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)))
  }
  console.error('Could not reach the portal for message', msg.wa_id)
}

const textOf = m => {
  const x = m?.ephemeralMessage?.message || m?.viewOnceMessage?.message || m
  return x?.conversation || x?.extendedTextMessage?.text || x?.imageMessage?.caption || x?.videoMessage?.caption || x?.documentMessage?.caption
    || (x?.imageMessage ? '[photo]' : x?.videoMessage ? '[video]' : x?.audioMessage ? '[voice note]' : x?.documentMessage ? '[document]' : x?.stickerMessage ? '[sticker]' : '')
}

async function start() {
  const { state: auth, saveCreds } = await useMultiFileAuthState(DATA_DIR)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
  sock = makeWASocket({ version, auth, logger: log, printQRInTerminal: false, markOnlineOnConnect: false, syncFullHistory: false, browser: ['NOVOURQ', 'Chrome', '1.0'] })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async u => {
    if (u.qr) { state.status = 'qr'; state.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 }).catch(() => '') }
    if (u.connection === 'open') { state.status = 'connected'; state.qr = ''; state.phone = (sock.user?.id || '').split(':')[0].split('@')[0] }
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode
      state.status = 'closed'; state.phone = ''
      if (code === DisconnectReason.loggedOut) { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch {} }
      setTimeout(() => start().catch(e => console.error(e)), code === DisconnectReason.loggedOut ? 500 : 3000)
    }
  })

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      const jid = m.key?.remoteJid || ''
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue
      const body = textOf(m.message)
      if (!body) continue
      const alt = m.key.remoteJidAlt || ''
      const phoneJid = jid.endsWith('@s.whatsapp.net') ? jid : alt.endsWith('@s.whatsapp.net') ? alt : ''
      toPortal({
        wa_id: m.key.id, jid, phone: phoneJid ? phoneJid.split('@')[0].split(':')[0] : '', name: m.pushName || '',
        from_me: !!m.key.fromMe, body: String(body).slice(0, 4000), at: new Date(Number(m.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
      })
    }
  })
}

// Sends go one at a time with a pause between them, like a person would, so the number is not flagged.
let chain = Promise.resolve()
const pause = () => new Promise(r => setTimeout(r, 3000 + Math.random() * 4000))
function enqueue(fn) { const p = chain.then(fn); chain = p.catch(() => {}).then(pause); return p }

const app = express()
app.use(express.json({ limit: '100kb' }))
app.use((req, res, next) => { if (req.headers.authorization !== `Bearer ${SECRET}`) return res.status(401).json({ error: 'Not allowed' }); next() })

app.get('/status', (_req, res) => res.json({ status: state.status, qr: state.qr, phone: state.phone }))

app.post('/send', async (req, res) => {
  if (state.status !== 'connected' || !sock) return res.status(409).json({ error: 'WhatsApp is not linked. Scan the QR code in the portal first.' })
  const to = String(req.body?.to || '').trim()
  const text = String(req.body?.text || '').trim().slice(0, 4000)
  if (!to || !text) return res.status(400).json({ error: 'Need a number and a message' })
  try {
    const out = await enqueue(async () => {
      let jid = to.includes('@') ? to : ''
      if (!jid) {
        const digits = to.replace(/\D/g, '')
        if (digits.length < 8) throw new Error('That does not look like a phone number. Use the country code, for example 447700900123.')
        const [r] = (await sock.onWhatsApp(digits)) || []
        if (!r?.exists) throw new Error('That number is not on WhatsApp.')
        jid = r.jid
      }
      const sent = await sock.sendMessage(jid, { text })
      return { wa_id: sent?.key?.id || '', jid }
    })
    res.json({ ok: true, ...out })
  } catch (e) { res.status(500).json({ error: e?.message || 'Could not send' }) }
})

app.post('/logout', async (_req, res) => {
  try { await sock?.logout() } catch {}
  res.json({ ok: true })
})

app.listen(PORT, () => console.log('NOVOURQ WhatsApp bridge listening on', PORT))
start().catch(e => { console.error(e); process.exit(1) })
