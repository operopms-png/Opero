// Draws a Sangsters invoice as an A4 PDF (pdf-lib, no browser needed), in the
// same layout as the Canva invoice: gold logo block and contact lines, "INVOICE"
// title, Bill to + number/date/due, gold table header, items, total, payment
// instructions, black "BALANCE DUE" box, signature and terms note.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type InvoiceSettings = {
  company_name: string; logo_url?: string | null; logo_line1?: string | null; logo_line2?: string | null
  contact_lines?: string | null; payment_instructions?: string | null; signature_name?: string | null; signature_url?: string | null; terms_note?: string | null
}
export type InvoiceData = {
  number: string | null; bill_to_name: string; bill_to_phone?: string | null; bill_to_address?: string | null
  issue_date: string; due_date?: string | null; currency: string; items: { description: string; qty: number; amount: number }[]; total: number; note?: string | null
}

const SYM: Record<string, string> = { GBP: '£', JMD: 'J$', USD: '$' }
export const fmtMoney = (n: number, cur: string) => (SYM[cur] ?? '') + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
// Standard PDF fonts only cover Western characters; swap anything else out.
const safe = (s: any) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ–—•€]/g, '?')

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = []
  for (const para of safe(text).split('\n')) {
    let line = ''
    for (const w of para.split(/\s+/)) {
      const t = line ? line + ' ' + w : w
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w } else line = t
    }
    out.push(line)
  }
  return out
}

async function loadImage(pdf: PDFDocument, url?: string | null, base?: string) {
  if (!url) return null
  try {
    const abs = /^https?:\/\//.test(url) ? url : (base || '') + url
    const res = await fetch(abs)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
  } catch { return null }
}

export async function invoicePdf(inv: InvoiceData, s: InvoiceSettings, siteUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Invoice ${inv.number || ''} — ${s.company_name}`)
  const page: PDFPage = pdf.addPage([595.28, 841.89])
  const W = 595.28, H = 841.89, M = 42
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), ital = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const ink = hex('#222222'), grey = hex('#666666'), light = hex('#888888'), goldLbl = hex('#D9B860')
  const text = (t: string, x: number, y: number, size: number, font = reg, color = ink) => page.drawText(safe(t), { x, y: H - y, size, font, color })
  const right = (t: string, x: number, y: number, size: number, font = reg, color = ink) => text(t, x - font.widthOfTextAtSize(safe(t), size), y, size, font, color)

  // logo block
  page.drawRectangle({ x: M, y: H - 42 - 52, width: 162, height: 52, color: hex('#C9A24A') })
  const logo = await loadImage(pdf, s.logo_url, siteUrl)
  if (logo) { const h = 44, w = logo.width / logo.height * h; page.drawImage(logo, { x: M + 6, y: H - 42 - 48, width: Math.min(w, 54), height: h }) }
  text(s.logo_line1 || '', M + 66, 63, 9.5, bold, hex('#2a1f0c'))
  text(s.logo_line2 || '', M + 66, 75, 8, reg, hex('#2a1f0c'))
  // contact lines
  ;(s.contact_lines || '').split('\n').forEach((l, i) => right(l, W - M, 50 + i * 13.5, 10, reg, grey))

  // title row
  text(s.company_name, M, 140, 20, bold)
  right('INVOICE', W - M, 140, 22, bold)
  page.drawLine({ start: { x: 26, y: H - 150 }, end: { x: W - 26, y: H - 150 }, thickness: 0.8, color: hex('#999999') })

  // bill to + meta
  text('BILL TO:', M, 175, 9.5, reg, goldLbl)
  text(safe(inv.bill_to_name).toUpperCase(), M + 66, 177, 15, bold)
  let by = 192
  for (const l of [inv.bill_to_phone, ...(inv.bill_to_address || '').split('\n')].filter(Boolean) as string[]) { text(l, M + 66, by, 10.5, reg, grey); by += 13 }
  const meta: [string, string][] = [['NUMBER:', inv.number || 'DRAFT'], ['DATE:', fmtDate(inv.issue_date)], ['DUE DATE:', inv.due_date ? fmtDate(inv.due_date) : 'On receipt']]
  meta.forEach(([k, v], i) => { right(k, 470, 176 + i * 14, 9.5, reg, goldLbl); text(v, 478, 176 + i * 14, 10.5) })

  // table
  let y = Math.max(250, by + 30)
  page.drawRectangle({ x: 26, y: H - y - 22, width: W - 52, height: 24, color: hex('#F8E3A3') })
  text('Description', M, y - 6 + 16, 10.5); text('Quantity', 395, y - 6 + 16, 10.5); right('Amount', W - M, y - 6 + 16, 10.5)
  y += 24
  for (const it of inv.items) {
    const lines = wrap(it.description || '', reg, 11, 320)
    const h = Math.max(26, 12 + lines.length * 13)
    lines.forEach((l, i) => text(l, M, y + 17 + i * 13, 11))
    const q = String(it.qty ?? 1); text(q, 418 - reg.widthOfTextAtSize(q, 11) / 2, y + 17, 11)
    right(fmtMoney((Number(it.qty) || 1) * (Number(it.amount) || 0), inv.currency), W - M, y + 17, 11)
    y += h
    page.drawLine({ start: { x: 26, y: H - y }, end: { x: W - 26, y: H - y }, thickness: 0.6, color: hex('#DDDDDD') })
  }
  y += 34
  text('TOTAL:', 420, y, 11); right(fmtMoney(inv.total, inv.currency), W - M, y, 11)

  // payment instructions + balance box
  y += 36
  text('Payment instructions', M, y, 11, bold)
  const pay = [...(s.payment_instructions || '').split('\n'), '', `Reference: ${inv.number || ''}`]
  pay.forEach((l, i) => text(l, M, y + 15 + i * 13.5, 10.5))
  const bal = 'BALANCE DUE TODAY', amt = fmtMoney(inv.total, inv.currency), bw = bold.widthOfTextAtSize(bal, 15) + bold.widthOfTextAtSize(amt, 15) + 50
  page.drawRectangle({ x: W - M - bw, y: H - y - 22, width: bw, height: 34, color: hex('#1F1F1F') })
  text(bal, W - M - bw + 14, y + 4, 15, bold, rgb(1, 1, 1)); right(amt, W - M - 14, y + 4, 15, bold, rgb(1, 1, 1))

  // signature
  let sy = y + 15 + pay.length * 13.5 + 18
  const sig = await loadImage(pdf, s.signature_url, siteUrl)
  if (sig) { const h = 34, w = sig.width / sig.height * h; page.drawImage(sig, { x: W - M - 70 - w / 2, y: H - sy - 4, width: w, height: h }) }
  else if (s.signature_name) { const sz = 24; text(s.signature_name, W - M - 70 - ital.widthOfTextAtSize(safe(s.signature_name), sz) / 2, sy, sz, ital) }
  page.drawLine({ start: { x: W - M - 140, y: H - sy - 8 }, end: { x: W - M, y: H - sy - 8 }, thickness: 0.7, color: hex('#444444') })
  text('Business signature', W - M - 70 - reg.widthOfTextAtSize('Business signature', 10) / 2, sy + 22, 10)

  // note + terms
  let ty = sy + 56
  if (inv.note) { for (const l of wrap(inv.note, reg, 10.5, W - 2 * M)) { text(l, M, ty, 10.5, reg, ink); ty += 14 } ty += 8 }
  for (const l of wrap(s.terms_note || '', reg, 10, W - 2 * M)) { text(l, M, ty, 10, reg, light); ty += 13.5 }
  return pdf.save()
}
