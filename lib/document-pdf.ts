// Draws a sent document as an A4 PDF (pdf-lib): Sangsters letterhead on every
// page, the document text (headings, paragraphs, lists, bold/italic), and at the
// end either signature lines or the electronic signature record.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { htmlToBlocks, type Run } from './doc-text'

const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const safe = (s: any) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[‑‐]/g, '-').replace(/☐/g, '[ ]').replace(/☑|☒/g, '[x]').replace(/[^\x20-\x7E -ÿ–—•€]/g, '')

async function loadImage(pdf: PDFDocument, url?: string | null, base?: string) {
  if (!url) return null
  try {
    const res = await fetch(/^https?:\/\//.test(url) ? url : (base || '') + url)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return bytes[0] === 0x89 && bytes[1] === 0x50 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
  } catch { return null }
}

export type DocForPdf = {
  title: string; body: string; recipient_name: string; needs_signature: boolean
  signed_at?: string | null; signed_name?: string | null; signed_ip?: string | null; sent_at?: string | null; token?: string
}

export async function documentPdf(doc: DocForPdf, s: { company_name?: string | null; logo_url?: string | null; contact_lines?: string | null }, siteUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(safe(doc.title))
  const W = 595.28, H = 841.89, M = 58, TOP = 112, BOTTOM = 70, CW = W - 2 * M
  const F = {
    reg: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    ital: await pdf.embedFont(StandardFonts.TimesRomanItalic), boldItal: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
    sans: await pdf.embedFont(StandardFonts.Helvetica), sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }
  const ink = hex('#1F1F1F'), grey = hex('#6B6B6B'), gold = hex('#89CFF0'), goldBg = hex('#89CFF0')
  const logo = await loadImage(pdf, s.logo_url, siteUrl)
  const company = s.company_name || 'Sangsters Group'
  const pages: PDFPage[] = []
  let page!: PDFPage, y = 0

  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page); y = TOP
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: goldBg })
    if (logo) { page.drawRectangle({ x: M, y: H - 34 - 40, width: 40, height: 40, color: goldBg }); const d = logo.scaleToFit(34, 34); page.drawImage(logo, { x: M + 3, y: H - 34 - 37, width: d.width, height: d.height }) }
    const tx = logo ? M + 50 : M
    page.drawText(safe(company), { x: tx, y: H - 52, size: 13, font: F.sansBold, color: ink })
    page.drawText(safe(doc.title).slice(0, 80), { x: tx, y: H - 67, size: 8.5, font: F.sans, color: grey })
    const contact = (s.contact_lines || '').split('\n').filter(Boolean).slice(0, 3)
    contact.forEach((l, k) => { const t = safe(l); page.drawText(t, { x: W - M - F.sans.widthOfTextAtSize(t, 8), y: H - 46 - k * 11, size: 8, font: F.sans, color: grey }) })
    page.drawLine({ start: { x: M, y: H - 88 }, end: { x: W - M, y: H - 88 }, thickness: 0.6, color: hex('#D8CFB8') })
  }
  const ensure = (h: number) => { if (y + h > H - BOTTOM) newPage() }

  type Word = { text: string; font: PDFFont; u?: boolean; empty?: boolean; space: boolean }
  const fontFor = (r: Run, base: 'serif' | 'head') => base === 'head' ? F.sansBold : r.b && r.i ? F.boldItal : r.b ? F.bold : r.i ? F.ital : F.reg

  function drawRuns(runs: Run[], opts: { size: number; lead: number; x: number; width: number; center?: boolean; base?: 'serif' | 'head'; color?: any; marker?: string }) {
    // break the runs into words, keeping each word's font; "\n" forces a new line
    const lines: Word[][] = [[]]
    let lineW = 0
    const space = (f: PDFFont) => f.widthOfTextAtSize(' ', opts.size)
    for (const r of runs) {
      if (r.text === '\n') { lines.push([]); lineW = 0; continue }
      const font = fontFor(r, opts.base || 'serif')
      const parts = safe(r.text).split(/(\s+)/)
      for (const p of parts) {
        if (!p) continue
        const line = lines[lines.length - 1]
        if (/^\s+$/.test(p)) { if (line.length) line[line.length - 1].space = true; continue }
        const w = font.widthOfTextAtSize(p, opts.size)
        const gap = line.length && line[line.length - 1].space ? space(line[line.length - 1].font) : 0
        if (line.length && lineW + gap + w > opts.width) { lines.push([{ text: p, font, u: r.u, empty: r.empty, space: false }]); lineW = w }
        else { line.push({ text: p, font, u: r.u, empty: r.empty, space: false }); lineW += gap + w }
      }
    }
    lines.forEach((line, li) => {
      if (!line.length && li === lines.length - 1) return
      ensure(opts.lead)
      const width = line.reduce((a, w, k) => a + w.font.widthOfTextAtSize(w.text, opts.size) + (k < line.length - 1 && w.space ? space(w.font) : 0), 0)
      let x = opts.center ? M + (CW - width) / 2 : opts.x
      if (li === 0 && opts.marker) page.drawText(safe(opts.marker), { x: opts.x - 14, y: H - y - opts.size, size: opts.size, font: F.reg, color: opts.color || ink })
      for (let k = 0; k < line.length; k++) {
        const w = line[k], ww = w.font.widthOfTextAtSize(w.text, opts.size)
        page.drawText(w.text, { x, y: H - y - opts.size, size: opts.size, font: w.font, color: w.empty ? grey : (opts.color || ink) })
        if (w.u) page.drawLine({ start: { x, y: H - y - opts.size - 1.5 }, end: { x: x + ww, y: H - y - opts.size - 1.5 }, thickness: 0.5, color: ink })
        x += ww + (w.space ? space(w.font) : 0)
      }
      y += opts.lead
    })
  }

  newPage()
  const blocks = htmlToBlocks(doc.body)
  for (const bl of blocks) {
    if (bl.type === 'hr') { ensure(14); page.drawLine({ start: { x: M, y: H - y - 6 }, end: { x: W - M, y: H - y - 6 }, thickness: 0.5, color: hex('#BBBBBB') }); y += 14; continue }
    if (bl.type === 'h1') { ensure(40); y += 6; drawRuns(bl.runs, { size: 15, lead: 20, x: M, width: CW, center: true, base: 'head' }); y += 10; continue }
    if (bl.type === 'h2') { ensure(34); y += 8; drawRuns(bl.runs, { size: 11.5, lead: 16, x: M, width: CW, center: bl.center, base: 'head', color: gold }); y += 4; continue }
    if (bl.type === 'h3') { ensure(28); y += 4; drawRuns(bl.runs, { size: 11, lead: 15, x: M, width: CW, center: bl.center, base: 'head' }); y += 2; continue }
    if (bl.type === 'li') { const ind = 18 + (bl.depth || 0) * 16; drawRuns(bl.runs, { size: 11, lead: 15, x: M + ind, width: CW - ind, marker: bl.marker }); y += 3; continue }
    if (bl.type === 'quote') { drawRuns(bl.runs, { size: 10.5, lead: 14.5, x: M + 16, width: CW - 16, color: grey }); y += 6; continue }
    drawRuns(bl.runs, { size: 11, lead: 15.5, x: M, width: CW, center: bl.center }); y += 7
  }

  // signatures
  if (doc.signed_at) {
    ensure(110); y += 14
    page.drawRectangle({ x: M, y: H - y - 88, width: CW, height: 88, color: hex('#FAF6EC'), borderColor: hex('#89CFF0'), borderWidth: 0.6 })
    page.drawText('SIGNED ELECTRONICALLY', { x: M + 14, y: H - y - 18, size: 8, font: F.sansBold, color: gold })
    page.drawText(safe(doc.signed_name), { x: M + 14, y: H - y - 48, size: 24, font: F.ital, color: ink })
    const when = new Date(doc.signed_at).toUTCString().replace('GMT', 'UTC')
    page.drawText(safe(`${doc.signed_name} · ${when}${doc.signed_ip ? ` · IP ${doc.signed_ip}` : ''}`), { x: M + 14, y: H - y - 66, size: 8.5, font: F.sans, color: grey })
    page.drawText(safe(`Document reference ${String(doc.token || '').slice(0, 12).toUpperCase()}`), { x: M + 14, y: H - y - 78, size: 8, font: F.sans, color: grey })
    y += 100
  } else if (doc.needs_signature) {
    ensure(90); y += 22
    for (const who of [doc.recipient_name, `For ${company}`]) {
      page.drawLine({ start: { x: M, y: H - y - 24 }, end: { x: M + 230, y: H - y - 24 }, thickness: 0.6, color: ink })
      page.drawLine({ start: { x: M + 270, y: H - y - 24 }, end: { x: M + 380, y: H - y - 24 }, thickness: 0.6, color: ink })
      page.drawText(safe(who), { x: M, y: H - y - 36, size: 9, font: F.sans, color: grey })
      page.drawText('Date', { x: M + 270, y: H - y - 36, size: 9, font: F.sans, color: grey })
      y += 46
    }
  }

  pages.forEach((p, k) => {
    const t = `Page ${k + 1} of ${pages.length}`
    p.drawText(t, { x: W - M - F.sans.widthOfTextAtSize(t, 8), y: 34, size: 8, font: F.sans, color: grey })
    p.drawText(safe(company), { x: M, y: 34, size: 8, font: F.sans, color: grey })
  })
  return pdf.save()
}
