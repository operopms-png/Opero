// Documents — shared helpers used by both the browser and the server (no imports).
//
// A template body is simple HTML (headings, paragraphs, bold/italic, lists) with
// blanks written as {key}. A choice blank lists its options: {package:Option A|Option B}.
// When a document is made from a template each blank becomes
//   <span data-field="key">value</span>                       filled in from the person/property
//   <span data-field="key" data-empty="1">[Label]</span>       still empty — staff or the client fill it in
// The wording check compares the text with every blank collapsed, so filling blanks
// never counts as a wording change, but editing any other text does.

export type Blank = { key: string; label: string; group: string }
export const BLANKS: Blank[] = [
  { key: 'recipient_name', label: 'Full name', group: 'Person' },
  { key: 'first_name', label: 'First name', group: 'Person' },
  { key: 'recipient_email', label: 'Email', group: 'Person' },
  { key: 'recipient_phone', label: 'Phone', group: 'Person' },
  { key: 'recipient_address', label: 'Contact address', group: 'Person' },
  { key: 'property_address', label: 'Property address', group: 'Property' },
  { key: 'landlord_name', label: 'Landlord / owner', group: 'Property' },
  { key: 'rent', label: 'Monthly rent', group: 'Tenancy' },
  { key: 'deposit', label: 'Deposit', group: 'Tenancy' },
  { key: 'start_date', label: 'Start date', group: 'Tenancy' },
  { key: 'end_date', label: 'End date', group: 'Tenancy' },
  { key: 'term_months', label: 'Term (months)', group: 'Tenancy' },
  { key: 'amount_due', label: 'Amount due', group: 'Tenancy' },
  { key: 'due_date', label: 'Due date', group: 'Tenancy' },
  { key: 'check_in', label: 'Check-in date', group: 'Booking' },
  { key: 'check_out', label: 'Check-out date', group: 'Booking' },
  { key: 'booking_total', label: 'Booking total', group: 'Booking' },
  { key: 'date_of_birth', label: 'Date of birth', group: 'Usually the client fills in' },
  { key: 'permanent_residence', label: 'Permanent residence', group: 'Usually the client fills in' },
  { key: 'country_of_residence', label: 'Country of residence', group: 'Usually the client fills in' },
  { key: 'id_type', label: 'ID type', group: 'Usually the client fills in' },
  { key: 'id_number', label: 'ID / passport number', group: 'Usually the client fills in' },
  { key: 'id_country', label: 'ID issuing country', group: 'Usually the client fills in' },
  { key: 'tax_reference', label: 'Local tax reference (or N/A)', group: 'Usually the client fills in' },
  { key: 'package', label: 'Management package', group: 'Agreement' },
  { key: 'funds_account', label: 'How booking money is handled', group: 'Agreement' },
  { key: 'access_details', label: 'Access details / codes / contacts', group: 'Agreement' },
  { key: 'included_items', label: 'Included furniture / appliances', group: 'Agreement' },
  { key: 'payout_details', label: 'Payout currency & bank details', group: 'Agreement' },
  { key: 'payout_frequency', label: 'Payout frequency', group: 'Agreement' },
  { key: 'manager_name', label: 'Property manager name', group: 'Sangsters' },
  { key: 'manager_email', label: 'Property manager email', group: 'Sangsters' },
  { key: 'manager_phone', label: 'Property manager direct number', group: 'Sangsters' },
  { key: 'emergency_number', label: 'Out-of-hours emergency number', group: 'Sangsters' },
  { key: 'staff_role', label: 'Role of staff member signing', group: 'Sangsters' },
  { key: 'today', label: 'Today’s date', group: 'Sangsters' },
  { key: 'company_name', label: 'Company name', group: 'Sangsters' },
  { key: 'staff_name', label: 'Staff member sending', group: 'Sangsters' },
  { key: 'staff_email', label: 'Staff member’s email', group: 'Sangsters' },
]
export const blankLabel = (key: string) => BLANKS.find(b => b.key === key)?.label || key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

export const TOKEN_RE = /\{([a-z][a-z0-9_]*)(?::([^{}<>]*))?\}/g
export const esc = (t: any) => String(t ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))
export const decode = (t: string) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

/** Blanks used in a template body, in order, without duplicates. */
export function blanksIn(body: string): { key: string; options?: string[] }[] {
  const out: { key: string; options?: string[] }[] = []
  for (const m of body.matchAll(TOKEN_RE)) if (!out.some(o => o.key === m[1])) out.push({ key: m[1], options: m[2] ? m[2].split('|').map(s => s.trim()).filter(Boolean) : undefined })
  return out
}

const ALLOWED = new Set(['p', 'h1', 'h2', 'h3', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'hr', 'span', 'div', 'blockquote'])
/** Keep only simple formatting. Blank spans keep their data attributes; paragraphs keep centring. */
export function sanitizeHtml(html: string): string {
  let s = String(html || '').replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<(script|style|iframe|object|embed|head|title|svg|math|template)[\s\S]*?<\/\1\s*>/gi, '')
  s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (all, tag: string, attrs: string) => {
    const t = tag.toLowerCase(), closing = all.startsWith('</')
    if (!ALLOWED.has(t)) return t === 'table' || t === 'tr' ? (closing ? '' : '') : t === 'td' || t === 'th' ? (closing ? ' ' : '') : ''
    const tt = t === 'div' ? 'p' : t === 'strong' ? 'b' : t === 'em' ? 'i' : t
    if (closing) return tt === 'br' || tt === 'hr' ? '' : `</${tt}>`
    if (tt === 'br' || tt === 'hr') return `<${tt}>`
    if (tt === 'span') {
      const f = attrs.match(/data-field="([a-z][a-z0-9_]*)"/)
      if (!f) return '<span>'
      const empty = /data-empty="1"/.test(attrs) ? ' data-empty="1"' : ''
      const ch = attrs.match(/data-choice="([^"]*)"/)
      return `<span data-field="${f[1]}"${empty}${ch ? ` data-choice="${ch[1]}"` : ''}>`
    }
    if (['p', 'h1', 'h2', 'h3'].includes(tt) && /text-align:\s*center/i.test(attrs)) return `<${tt} style="text-align:center">`
    return `<${tt}>`
  })
  // <span> without a field adds nothing — drop the pair
  s = s.replace(/<span>([\s\S]*?)<\/span>/g, '$1')
  return s.trim()
}

/** Turn a template body into a document: blanks become filled or empty spans. */
export function fillBody(body: string, values: Record<string, any>, defaults: Record<string, any> = {}): string {
  return body.replace(TOKEN_RE, (_, key: string, opts?: string) => {
    const v = values[key] ?? defaults[key]
    if (v != null && String(v).trim() !== '') return `<span data-field="${key}">${esc(v)}</span>`
    return `<span data-field="${key}" data-empty="1"${opts ? ` data-choice="${esc(opts)}"` : ''}>[${esc(blankLabel(key))}]</span>`
  })
}

/** Text of a document with every blank collapsed — used to spot wording changes. */
export function wordingText(html: string): string {
  return decode(String(html || '')
    .replace(/<span data-field="[^"]*"[^>]*>[\s\S]*?<\/span>/g, ' {•} ')
    .replace(/<(br|\/p|\/h[1-3]|\/li|hr)[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ').trim()
}

/** After editing: a once-empty blank whose text was typed over counts as filled. */
export function settleBlanks(html: string): string {
  return html.replace(/<span data-field="([a-z0-9_]+)" data-empty="1"([^>]*)>([\s\S]*?)<\/span>/g, (all, key, rest, inner) => {
    const txt = decode(inner.replace(/<[^>]+>/g, '')).trim()
    if (!txt || txt === `[${blankLabel(key)}]`) return all
    return `<span data-field="${key}">${inner}</span>`
  })
}

export const emptyBlanks = (html: string) => [...String(html || '').matchAll(/<span data-field="([a-z0-9_]+)" data-empty="1"(?: data-choice="([^"]*)")?>/g)].map(m => ({ key: m[1], options: m[2] ? decode(m[2]).split('|').map(s => s.trim()) : undefined }))

/** Fill the remaining empty blanks with what the client typed when signing. */
export function applyClientFields(html: string, vals: Record<string, string>): string {
  return html.replace(/<span data-field="([a-z0-9_]+)" data-empty="1"[^>]*>[\s\S]*?<\/span>/g, (all, key) => vals[key] ? `<span data-field="${key}">${esc(vals[key])}</span>` : all)
}

/** Word-level diff (for showing what wording was changed). */
export function diffWords(a: string, b: string): { t: 'same' | 'del' | 'add'; s: string }[] {
  const A = a.split(' '), B = b.split(' ')
  if (A.length * B.length > 4_000_000) return [{ t: 'del', s: a }, { t: 'add', s: b }]
  const n = A.length, m = B.length
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: { t: 'same' | 'del' | 'add'; s: string }[] = []
  const push = (t: 'same' | 'del' | 'add', w: string) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += ' ' + w; else out.push({ t, s: w }) }
  let i = 0, j = 0
  while (i < n && j < m) { if (A[i] === B[j]) { push('same', A[i]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]); else push('add', B[j++]) }
  while (i < n) push('del', A[i++]); while (j < m) push('add', B[j++])
  return out
}

/** Short "old → new" lines for an approval request. */
export function changeSummary(base: string, body: string, max = 6): string[] {
  const d = diffWords(wordingText(base), wordingText(body)), out: string[] = []
  for (let k = 0; k < d.length && out.length < max; k++) {
    if (d[k].t === 'same') continue
    const del = d[k].t === 'del' ? d[k].s : '', add = d[k].t === 'add' ? d[k].s : (d[k + 1]?.t === 'add' ? d[++k].s : '')
    const cut = (s: string) => s.length > 90 ? s.slice(0, 87) + '…' : s
    out.push(del && add ? `“${cut(del)}” → “${cut(add)}”` : del ? `Removed: “${cut(del)}”` : `Added: “${cut(add)}”`)
  }
  return out
}

// ---- turning the HTML into blocks (for the PDF) ----
export type Run = { text: string; b?: boolean; i?: boolean; u?: boolean; empty?: boolean }
export type Block = { type: 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'hr' | 'quote'; runs: Run[]; center?: boolean; marker?: string; depth?: number }
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null as Block | null
  let b = 0, i = 0, u = 0, quote = 0
  const lists: { ordered: boolean; n: number }[] = []
  const spans: boolean[] = []
  const flush = () => { if (cur && cur.runs.some(r => r.text.trim())) blocks.push(cur); cur = null }
  const start = (type: Block['type'], center = false) => { flush(); cur = { type: quote && type === 'p' ? 'quote' : type, runs: [], center } }
  for (const m of String(html || '').matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi)) {
    if (m[4] != null) {
      const text = decode(m[4]).replace(/\s+/g, ' ')
      if (!text.trim() && !cur) continue
      if (!cur) start('p')
      const empty = spans.includes(true)
      cur!.runs.push({ text: empty ? '____________' : text, b: b > 0, i: i > 0, u: u > 0, empty })
      continue
    }
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3] || ''
    if (tag === 'br') { if (cur) cur.runs.push({ text: '\n' }); continue }
    if (tag === 'hr') { flush(); blocks.push({ type: 'hr', runs: [] }); continue }
    if (['p', 'h1', 'h2', 'h3', 'div'].includes(tag)) { if (close) flush(); else start(tag === 'div' ? 'p' : tag as any, /text-align:\s*center/i.test(attrs)); continue }
    if (tag === 'blockquote') { flush(); quote += close ? -1 : 1; continue }
    if (tag === 'ul' || tag === 'ol') { flush(); if (close) lists.pop(); else lists.push({ ordered: tag === 'ol', n: 0 }); continue }
    if (tag === 'li') { if (close) { flush(); continue } const l = lists[lists.length - 1]; start('li'); if (l) l.n++; cur!.marker = l?.ordered ? `${l.n}.` : '•'; cur!.depth = Math.max(0, lists.length - 1); continue }
    if (tag === 'b' || tag === 'strong') { b += close ? -1 : 1; continue }
    if (tag === 'i' || tag === 'em') { i += close ? -1 : 1; continue }
    if (tag === 'u') { u += close ? -1 : 1; continue }
    if (tag === 'span') { if (close) spans.pop(); else spans.push(/data-empty="1"/.test(attrs)); continue }
  }
  flush()
  return blocks
}
