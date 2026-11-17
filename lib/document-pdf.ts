// Draws a sent document as an A4 PDF (pdf-lib): NOVOURQ letterhead on every
// page, the document text (headings, paragraphs, lists, bold/italic), and at the
// end either signature lines or the electronic signature record.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { htmlToBlocks, docBackground, type Run } from './doc-text'

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
  signed_at?: string | null; signed_name?: string | null; signed_ip?: string | null; sent_at?: string | null; token?: string; signature_data?: string | null
}

export async function documentPdf(doc: DocForPdf, s: { company_name?: string | null; logo_url?: string | null; contact_lines?: string | null }, siteUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(safe(doc.title))
  const W = 595.28, H = 841.89, M = 46, TOP = 88, BOTTOM = 66, CW = W - 2 * M
  const F = {
    reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    ital: await pdf.embedFont(StandardFonts.HelveticaOblique), boldItal: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    sans: await pdf.embedFont(StandardFonts.Helvetica), sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }
  const ink = hex('#1F2937'), grey = hex('#4B5563'), navy = hex('#182D5E')
  // NOVOURQ form look: the NOVOURQ mark top-left on every page, navy uppercase headings, a ruled footer with page numbers
  const logo = await loadImage(pdf, (s.company_name || '').trim().toUpperCase() === 'NOVOURQ' ? '/novourq-form-logo.png' : (s.logo_url || '/novourq-form-logo.png'), siteUrl)
  const bgUrl = docBackground(doc.title)
  const bg = bgUrl ? await loadImage(pdf, bgUrl, siteUrl) : null
  const company = s.company_name || 'Property Management Team'
  const pages: PDFPage[] = []
  let page!: PDFPage, y = 0

  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page); y = TOP
    if (bg) { const bh = W * bg.height / bg.width; page.drawImage(bg, { x: 0, y: (H - bh) / 2, width: W, height: bh, opacity: 0.55 }) }
    if (logo) { const d = logo.scaleToFit(44, 44); page.drawImage(logo, { x: M, y: H - 14 - d.height, width: d.width, height: d.height }) }
    else page.drawText(safe(company), { x: M, y: H - 52, size: 14, font: F.sansBold, color: navy })
  }
  const ensure = (h: number) => { if (y + h > H - BOTTOM) newPage() }

  type Word = { text: string; font: PDFFont; u?: boolean; empty?: boolean; space: boolean; kind?: 'line' | 'opt'; w?: number }
  const wOf = (w: Word, size: number) => w.kind === 'line' ? 70 : w.kind === 'opt' ? 12 + w.font.widthOfTextAtSize(w.text, size) : w.font.widthOfTextAtSize(w.text, size)
  const BOX = 8
  const fontFor = (r: Run, base: 'serif' | 'head') => base === 'head' ? F.sansBold : r.b && r.i ? F.boldItal : r.b ? F.bold : r.i ? F.ital : F.reg

  function drawRuns(runs: Run[], opts: { size: number; lead: number; x: number; width: number; center?: boolean; base?: 'serif' | 'head'; color?: any; marker?: string }) {
    // break the runs into words, keeping each word's font; "\n" forces a new line
    const lines: Word[][] = [[]]
    let lineW = 0
    const space = (f: PDFFont) => f.widthOfTextAtSize(' ', opts.size)
    for (const r of runs) {
      if (r.text === '\n') { lines.push([]); lineW = 0; continue }
      const font = fontFor(r, opts.base || 'serif')
      if (r.empty) {
        const items: Word[] = r.choice?.length ? r.choice.map(o => ({ text: safe(o), font: F.reg, kind: 'opt' as const, space: true })) : [{ text: '', font, kind: 'line' as const, empty: true, space: false }]
        for (const it of items) {
          const line = lines[lines.length - 1]
          const w = wOf(it, opts.size), gap = line.length && line[line.length - 1].space ? space(line[line.length - 1].font) : 0
          if (line.length && lineW + gap + w > opts.width) { lines.push([it]); lineW = w } else { line.push(it); lineW += gap + w }
        }
        if (lines[lines.length - 1].length) lines[lines.length - 1][lines[lines.length - 1].length - 1].space = true
        continue
      }
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
      const width = line.reduce((a, w, k) => a + wOf(w, opts.size) + (k < line.length - 1 && w.space ? space(w.font) : 0), 0)
      let x = opts.center ? M + (CW - width) / 2 : opts.x
      if (li === 0 && opts.marker) page.drawText(safe(opts.marker), { x: opts.x - 14, y: H - y - opts.size, size: opts.size, font: F.reg, color: opts.color || ink })
      for (let k = 0; k < line.length; k++) {
        const w = line[k], ww = wOf(w, opts.size)
        if (w.kind === 'line') { page.drawLine({ start: { x, y: H - y - opts.size - 1.5 }, end: { x: x + ww, y: H - y - opts.size - 1.5 }, thickness: 0.5, color: ink }) }
        else if (w.kind === 'opt') { page.drawRectangle({ x, y: H - y - opts.size - 0.5, width: BOX, height: BOX, borderColor: ink, borderWidth: 0.7 }); page.drawText(w.text, { x: x + 12, y: H - y - opts.size, size: opts.size, font: w.font, color: ink }) }
        else page.drawText(w.text, { x, y: H - y - opts.size, size: opts.size, font: w.font, color: opts.color || ink })
        if (w.u) page.drawLine({ start: { x, y: H - y - opts.size - 1.5 }, end: { x: x + ww, y: H - y - opts.size - 1.5 }, thickness: 0.5, color: ink })
        x += ww + (w.space ? space(w.font) : 0)
      }
      y += opts.lead
    })
  }

  // a "Label  ______" line is drawn as a form row: navy label, then a ruled line (or tick boxes) that fills the rest of the row
  const lineRuns = (runs: Run[]) => { const out: Run[][] = [[]]; for (const r of runs) { if (r.text === '\n') out.push([]); else out[out.length - 1].push(r) } return out.filter(l => l.some(r => r.empty || r.text.trim())) }
  const isRow = (l: Run[]) => l.some(r => r.empty) && !!l.find(r => r.text.trim() || r.empty)?.b
  function formRow(l: Run[], size: number) {
    type Tok = { k: 'label' | 'text' | 'line' | 'opts'; t?: string; o?: string[]; w: number }
    const toks: Tok[] = []
    for (const r of l) {
      if (r.empty) { if (r.choice?.length) toks.push({ k: 'opts', o: r.choice.map(safe), w: r.choice.reduce((a, o) => a + BOX + 4 + F.reg.widthOfTextAtSize(safe(o), size) + 12, 0) }); else toks.push({ k: 'line', w: 0 }) }
      else { const raw = safe(r.text).replace(/\s+/g, ' '); const isLabel = !!r.b; const t = isLabel ? raw.replace(/:\s*$/, '').trim() : raw.trim(); if (t) toks.push({ k: isLabel ? 'label' : 'text', t, w: (isLabel ? F.bold : F.reg).widthOfTextAtSize(t, size) }) }
    }
    const GAP = 8, n = toks.filter(t => t.k === 'line').length
    const fixed = toks.reduce((a, t) => a + t.w, 0) + GAP * (toks.length - 1)
    if (n && CW - fixed < 50 * n) return false
    const share = n ? (CW - fixed) / n : 0
    ensure(20)
    let x = M; const base = H - y - size
    for (const t of toks) {
      if (t.k === 'label') page.drawText(t.t!, { x, y: base, size, font: F.bold, color: navy })
      else if (t.k === 'text') page.drawText(t.t!, { x, y: base, size, font: F.reg, color: ink })
      else if (t.k === 'line') { page.drawLine({ start: { x, y: base - 2 }, end: { x: x + share, y: base - 2 }, thickness: 0.5, color: ink }); x += share - t.w }
      else { let ox = x; for (const o of t.o!) { page.drawRectangle({ x: ox, y: base - 0.5, width: BOX, height: BOX, borderColor: ink, borderWidth: 0.7 }); page.drawText(o, { x: ox + BOX + 4, y: base, size, font: F.reg, color: ink }); ox += BOX + 4 + F.reg.widthOfTextAtSize(o, size) + 12 } }
      x += t.w + GAP
    }
    y += 20
    return true
  }
  const upper = (runs: Run[]) => runs.map(r => (r.empty ? r : { ...r, text: r.text.toUpperCase() }))
  newPage()
  const blocks = htmlToBlocks(doc.body)
  // a document with no heading of its own (offer letters, notices) gets its title above the text
  if (blocks[0]?.type !== 'h1') { y += 4; drawRuns([{ text: safe(doc.title).toUpperCase() }], { size: 12, lead: 17, x: M, width: CW, base: 'head', color: navy }); y += 8 }
  for (const bl of blocks) {
    if (bl.type === 'hr') { ensure(14); page.drawLine({ start: { x: M, y: H - y - 6 }, end: { x: W - M, y: H - y - 6 }, thickness: 0.5, color: hex('#BBBBBB') }); y += 14; continue }
    if (bl.type === 'h1') { ensure(40); y += 6; drawRuns(upper(bl.runs), { size: 12, lead: 17, x: M, width: CW, base: 'head', color: navy }); y += 8; continue }
    if (bl.type === 'h2') { ensure(34); y += 8; drawRuns(upper(bl.runs), { size: 9.5, lead: 14, x: M, width: CW, base: 'head', color: navy }); y += 4; continue }
    if (bl.type === 'h3') { ensure(28); y += 4; drawRuns(upper(bl.runs), { size: 9.5, lead: 14, x: M, width: CW, base: 'head', color: navy }); y += 2; continue }
    if (bl.type === 'li') { const ind = 18 + (bl.depth || 0) * 16; drawRuns(bl.runs, { size: 9.5, lead: 13.5, x: M + ind, width: CW - ind, marker: bl.marker }); y += 6; continue }
    if (bl.type === 'quote') { drawRuns(bl.runs, { size: 9.5, lead: 13.5, x: M + 16, width: CW - 16, color: grey }); y += 6; continue }
    const ls = lineRuns(bl.runs)
    if (ls.some(isRow)) { for (const l of ls) { if (!(isRow(l) && formRow(l, 9.5))) { drawRuns(l, { size: 9.5, lead: 13.5, x: M, width: CW }); y += 4 } } y += 2; continue }
    drawRuns(bl.runs, { size: 9.5, lead: 13.5, x: M, width: CW, center: bl.center }); y += 6
  }

  // signatures
  if (doc.signed_at) {
    ensure(110); y += 14
    page.drawRectangle({ x: M, y: H - y - 88, width: CW, height: 88, color: hex('#F4F6FA'), borderColor: navy, borderWidth: 0.6 })
    page.drawText('SIGNED ELECTRONICALLY', { x: M + 14, y: H - y - 18, size: 8, font: F.sansBold, color: navy })
    let drew = false
    if (doc.signature_data?.startsWith('data:image/png;base64,')) {
      try { const img = await pdf.embedPng(Buffer.from(doc.signature_data.split(',')[1], 'base64')); const sc = Math.min(200 / img.width, 40 / img.height); page.drawImage(img, { x: M + 14, y: H - y - 56, width: img.width * sc, height: img.height * sc }); drew = true } catch { /* fall back to the typed name */ }
    }
    if (!drew) page.drawText(safe(doc.signed_name), { x: M + 14, y: H - y - 48, size: 24, font: F.ital, color: ink })
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

  const contact = (s.contact_lines || '').split('\n').map(l => l.trim()).filter(l => /@|www\./i.test(l))
  const foot = safe([company, ...contact].join(' · '))
  pages.forEach((p, k) => {
    const t = `Page ${k + 1} of ${pages.length}`
    p.drawLine({ start: { x: M + 8, y: 52 }, end: { x: W - M - 8, y: 52 }, thickness: 1.8, color: hex('#111111') })
    let f = foot; while (f.length > 4 && F.sans.widthOfTextAtSize(f, 8) > CW - 80) f = f.slice(0, -2)
    p.drawText(f, { x: M + 8, y: 36, size: 8, font: F.sans, color: grey })
    p.drawText(t, { x: W - M - 8 - F.sans.widthOfTextAtSize(t, 8), y: 36, size: 8, font: F.sans, color: grey })
  })
  return pdf.save()
}
