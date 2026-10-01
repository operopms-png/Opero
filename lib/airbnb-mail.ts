// Reads the Airbnb message emails that arrive in a connected mailbox when the
// account is used as a GUEST (e.g. the hello@ marketing account that messages
// hosts about our services). Airbnb has no messaging API for this, but every
// message email can be answered by replying to it (its Reply-To address posts
// straight into the Airbnb chat), so the portal groups these emails into chat
// threads and replies through the mailbox.
// Pure functions — safe on server or client.

export type AbItem = {
  kind: 'host' | 'you' | 'event'
  text: string
  at: string | null        // null = quoted earlier message (time unknown)
  emailId?: string         // the mailbox_messages row it came from
  sentBy?: string | null
}
export type AbParsed = {
  threadId: string | null
  listing: string | null
  host: string | null
  roomId: string | null
  items: AbItem[]
}

const URL_RE = /https?:\/\/\S+/g
const isAirbnb = (from?: string | null) => /@([\w-]+\.)*airbnb\.com$/i.test(from ?? '')
export const isAirbnbReplyAddress = (a?: string | null) => /@([\w-]+\.)*airbnb\.com$/i.test((a ?? '').trim())

// Hard-wrapped email lines -> paragraphs
function joinLines(lines: string[]) {
  const paras: string[] = []
  let cur: string[] = []
  for (const l of lines) {
    const t = l.trim()
    if (!t) { if (cur.length) { paras.push(cur.join(' ')); cur = [] } continue }
    cur.push(t)
  }
  if (cur.length) paras.push(cur.join(' '))
  return paras.join('\n\n').trim()
}
const indent = (l: string) => l.length - l.trimStart().length
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase())

function listingFrom(subject: string, body: string): string | null {
  const s = subject.replace(/^(re|fw|fwd):\s*/i, '')
  const m = s.match(/\bfor (.+?),\s+[A-Z][a-z]{2,8}\.? \d/)
  if (m) return m[1].trim()
  const inv = body.match(/invited you to book ([\s\S]+?)\s+for [A-Z][a-z]{2,8}\.? \d/)
  if (inv) return inv[1].replace(/\s+/g, ' ').trim()
  const up = body.match(/\n([A-Z0-9][A-Z0-9 '’&/()\-,.!]{3,80})\s*\n\s*\n?[^\n]*hosted by/)
  return up ? titleCase(up[1].trim()) : null
}

export function parseAirbnbEmail(row: { id?: string; from_email?: string | null; subject?: string | null; body_text?: string | null; date?: string | null }): AbParsed | null {
  if (!isAirbnb(row.from_email)) return null
  const body = (row.body_text ?? '').replace(/\r/g, '')
  const subject = row.subject ?? ''
  const thread = body.match(/messaging\/thread\/(\d+)[^\s\]]*?inbox_type=(\w+)/)
  // Only the guest side (us messaging hosts). Host-side mail comes through Smoobu.
  if (thread && thread[2] !== 'guest') return null
  const host = (body.match(/hosted by ([^\n\[]+)/)?.[1] ?? '').trim() || null
  const roomId = body.match(/airbnb\.[a-z.]+\/rooms\/(\d+)/)?.[1] ?? null
  const listing = listingFrom(subject, body)
  const at = row.date ?? null
  const items: AbItem[] = []

  if (thread) {
    const start = body.indexOf('communicate through Airbnb')
    // status line above the chat, e.g. "Debbie-Ann pre-approved your trip…"
    const pre = (start > 0 ? body.slice(0, start) : '').replace(URL_RE, '')
    const preParas = pre.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim())
      .filter(p => p && !/%opentrack%|reply faster|for your protection/i.test(p) && p !== p.toUpperCase() && p.length > 12)
    if (preParas.length) items.push({ kind: 'event', text: preParas[preParas.length - 1], at, emailId: row.id })

    if (start >= 0) {
      let rest = body.slice(start)
      rest = rest.slice(rest.indexOf('\n') + 1)
      if (/^\s*\[/.test(rest)) rest = rest.slice(rest.indexOf('\n') + 1) // the "[link]" line
      const end = rest.search(/\n\s*(Book now|Reply|Send pre-approval|Pre-approve[^\n]*|Decline|Respond|Write a review)\s*\n/)
      const lines = (end >= 0 ? rest.slice(0, end) : rest.slice(0, 4000)).split('\n')
      while (lines.length && !lines[0].trim()) lines.shift()
      const base = lines.length ? indent(lines[0]) : 0
      lines.shift() // sender name
      while (lines.length && !lines[0].trim()) lines.shift()
      if (lines.length && /^(host|co-host|guest)$/i.test(lines[0].trim())) lines.shift()
      // deeper-indented lines are earlier messages quoted above the new one
      const quotes: { who: string; lines: string[] }[] = []
      const own: string[] = []
      for (const l of lines) {
        const t = l.trim()
        if (!t) { (quotes.length && !own.some(Boolean) ? quotes[quotes.length - 1].lines : own).push(''); continue }
        if (indent(l) > base) {
          const who = t.match(/^([^:]{1,40}):\s+(.*)$/)
          if (who) quotes.push({ who: who[1], lines: [who[2]] })
          else if (quotes.length) quotes[quotes.length - 1].lines.push(t)
          else quotes.push({ who: 'You', lines: [t] })
        } else own.push(t)
      }
      for (const q of quotes) {
        const text = joinLines(q.lines)
        if (text) items.push({ kind: /^you$/i.test(q.who) ? 'you' : 'host', text, at: null, emailId: row.id })
      }
      const text = joinLines(own).replace(URL_RE, '').trim()
      if (text) items.push({ kind: 'host', text, at, emailId: row.id })
    }
    return { threadId: thread[1], listing, host, roomId, items }
  }

  // Booking-invitation notices (no chat thread link): show as events
  const first = body.replace(/[͏­]/g, '').split('\n').map(s => s.trim()).find(s => s && !/%opentrack%/.test(s))
  if (/invit|pre-?approv|expired|reminder to book/i.test(subject + ' ' + (first ?? ''))) {
    const inv = body.match(/(\S+ invited you to book[\s\S]+?\.)\s*\n/)
    const text = (inv ? inv[1] : subject).replace(/\s+/g, ' ').trim()
    if (text) items.push({ kind: 'event', text, at, emailId: row.id })
    return { threadId: null, listing, host, roomId, items }
  }
  return null
}

export const airbnbThreadUrl = (id: string) => `https://www.airbnb.com/messaging/thread/${id}?thread_type=home_booking&inbox_type=guest`
export const airbnbRoomUrl = (id: string) => `https://www.airbnb.com/rooms/${id}`
