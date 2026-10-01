// Ask AI (Staff Centre → AI Assistant → Ask AI, and the Deal Analyser chat).
// Builds a read-only snapshot of the portal for the AI to answer from, and
// calls Claude with the whole conversation (optionally with web search).
// Admins see everything; other staff only get properties, scripts and the
// Airbnb chats from mailboxes they can already open. Server-only.
import { serviceClient } from '@/lib/admin-auth'
import type { Caller } from '@/lib/mailbox'
import { buildThreads } from '@/lib/airbnb-inbox'
import { listScripts } from '@/lib/scripts'

export type ChatMsg = { role: 'user' | 'assistant'; content: string; at?: string; web?: boolean }

const SYM: Record<string, string> = { JMD: 'J$', USD: 'US$', GBP: '£', EUR: '€', CAD: 'C$', AED: 'AED ' }
const money = (n: any, cur?: string | null) => (n == null || n === '' || Number(n) === 0) ? '—' : `${SYM[cur || 'GBP'] ?? ''}${Number(n).toLocaleString('en-GB')}`
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const cut = (s: any, n: number) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t }

export async function portalContext(c: Caller): Promise<string> {
  const biz = c.businessId
  const out: string[] = []
  const today = new Date()
  const iso = (d: Date) => d.toISOString()

  // Lettings / portfolio (Estate Agency) — every staff member
  const { data: props } = await serviceClient.from('estate_properties').select('id,name,web_title,address,web_area,country,status,rent,currency,bedrooms,bathrooms,listed,show_on_website,airbnb_url').eq('user_id', biz).order('name')
  if (props?.length) {
    out.push('## Portfolio — Estate Agency properties (rent is per month)\n| Property | Area | Status | Rent | Beds | On listings link | On website | Airbnb |\n|---|---|---|---|---|---|---|---|\n' +
      props.map(p => `| ${p.web_title || p.name} | ${p.web_area || cut(p.address, 40)}${p.country ? ', ' + p.country : ''} | ${p.status || '—'} | ${money(p.rent, p.currency)} | ${p.bedrooms || '—'} | ${p.listed ? 'yes' : 'no'} | ${p.show_on_website ? 'yes' : 'no'} | ${p.airbnb_url ? 'yes' : 'no'} |`).join('\n'))
  }

  // Airbnb outreach chats (only from mailboxes this person can open)
  try {
    const { threads } = await buildThreads(c)
    if (threads.length) {
      out.push('## Airbnb Inbox — outreach chats with hosts (our guest-side Airbnb account)\n| Host | Listing | Where it stands | AI summary | Last message | Date |\n|---|---|---|---|---|---|\n' +
        threads.slice(0, 40).map(t => `| ${t.host || '—'} | ${cut(t.listing, 40) || '—'} | ${t.stage} | ${cut(t.stageSummary, 80) || '—'} | ${cut(t.lastText, 80)} | ${day(t.lastAt)} |`).join('\n'))
    }
  } catch { /* mailbox issues shouldn't stop the chat */ }

  // Scripts — every staff member
  const scripts = await listScripts(biz).catch(() => [])
  if (scripts.length) out.push('## Scripts (Marketing → Scripts)\n' + scripts.map(s => `### ${s.category}${s.stage ? ' — ' + s.stage : ''} — ${s.name}${s.kind === 'guide' ? ' (staff guide, not sent)' : ''}\n${cut(s.body, 900)}`).join('\n\n'))

  if (!c.isAdmin) {
    out.push('_Note: this staff member is not an admin, so tenancies, bookings, revenue and CRM details are not included._')
    return out.join('\n\n').slice(0, 60000)
  }

  const since90 = iso(new Date(today.getTime() - 90 * 864e5)), next60 = iso(new Date(today.getTime() + 60 * 864e5))
  const [{ data: pmProps }, { data: leases }, { data: tenants }, { data: maint }, { data: strProps }, { data: bookings }, { data: contacts }, { data: deals }, { data: viewings }, { data: meetings }] = await Promise.all([
    serviceClient.from('pm_properties').select('id,name,status').eq('user_id', biz),
    serviceClient.from('pm_leases').select('property_id,tenant_id,start_date,end_date,monthly_rent,status,renewal_status').eq('user_id', biz).order('end_date'),
    serviceClient.from('pm_tenants').select('id,name,status').eq('user_id', biz),
    serviceClient.from('pm_maintenance').select('property_id,title,priority,status,created_at').eq('user_id', biz).neq('status', 'Completed').order('created_at', { ascending: false }).limit(30),
    serviceClient.from('properties').select('id,name,nightly_rate,status').eq('user_id', biz),
    serviceClient.from('bookings').select('property_id,guest_name,check_in,check_out,status,total_amount,platform').gte('check_out', since90).lte('check_in', next60).order('check_in').limit(150),
    serviceClient.from('crm_contacts').select('name,type,source,status,module,created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(40),
    serviceClient.from('crm_deals').select('name,stage,value,module,created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(40),
    serviceClient.from('estate_viewings').select('property_id,prospect_name,status,scheduled_at,created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(20),
    serviceClient.from('meetings').select('title,attendee_name,topic,status,scheduled_at,preferred_time,created_at').eq('user_id', biz).order('created_at', { ascending: false }).limit(20),
  ])
  const pmName = new Map((pmProps ?? []).map(p => [p.id, p.name]))
  const tenName = new Map((tenants ?? []).map(t => [t.id, t.name]))
  const strName = new Map((strProps ?? []).map(p => [p.id, p.name]))
  const estName = new Map((props ?? []).map(p => [p.id, p.web_title || p.name]))

  if (leases?.length) out.push('## Tenancies (Property Management leases)\n| Property | Tenant | Rent/month | Start | End | Status | Renewal |\n|---|---|---|---|---|---|---|\n' +
    leases.map(l => `| ${pmName.get(l.property_id) || '—'} | ${tenName.get(l.tenant_id) || '—'} | ${money(l.monthly_rent)} | ${day(l.start_date)} | ${day(l.end_date)} | ${l.status || '—'} | ${l.renewal_status || '—'} |`).join('\n'))
  if (maint?.length) out.push('## Open maintenance\n' + maint.map(m => `- ${pmName.get(m.property_id) || 'Property'}: ${m.title} (${m.priority || 'normal'}, ${m.status}, reported ${day(m.created_at)})`).join('\n'))
  if (strProps?.length) out.push('## Vacation rentals (short stays)\n' + strProps.map(p => `- ${p.name}${p.nightly_rate ? ` — nightly rate ${money(p.nightly_rate)}` : ''}`).join('\n'))
  if (bookings?.length) out.push('## Short-stay bookings (last 90 days and next 60 days; amounts as recorded from Smoobu/Airbnb)\n| Property | Guest | Check-in | Check-out | Status | Amount | Platform |\n|---|---|---|---|---|---|---|\n' +
    bookings.map(b => `| ${strName.get(b.property_id) || '—'} | ${cut(b.guest_name, 30) || '—'} | ${day(b.check_in)} | ${day(b.check_out)} | ${b.status || '—'} | ${b.total_amount != null ? Number(b.total_amount).toLocaleString('en-GB') : '—'} | ${b.platform || '—'} |`).join('\n'))
  if (contacts?.length) out.push('## CRM — latest contacts\n' + contacts.map(x => `- ${x.name} — ${x.type || 'contact'}, ${x.module || ''}, source: ${x.source || '—'}, status: ${x.status || '—'}, added ${day(x.created_at)}`).join('\n'))
  if (deals?.length) out.push('## CRM — latest deals (pipeline)\n' + deals.map(d => `- ${d.name} — ${d.stage}${d.value ? `, value ${money(d.value)}` : ''} (${d.module || ''}, ${day(d.created_at)})`).join('\n'))
  if (viewings?.length) out.push('## Viewing requests\n' + viewings.map(v => `- ${v.prospect_name} — ${estName.get(v.property_id) || 'property'}, ${v.status}${v.scheduled_at ? ', ' + day(v.scheduled_at) : ''}`).join('\n'))
  if (meetings?.length) out.push('## Meetings / meeting requests\n' + meetings.map(m => `- ${m.attendee_name || m.title} — ${m.topic || m.title || ''}, ${m.status}${m.scheduled_at ? ', ' + day(m.scheduled_at) : m.preferred_time ? ', prefers ' + m.preferred_time : ''}`).join('\n'))
  return out.join('\n\n').slice(0, 90000)
}

export function systemPrompt(o: { c: Caller; portal: string | null; web: boolean; deal?: any }) {
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  let s = `You are the AI assistant inside the Sangsters staff portal. Sangsters Group is a property company working in Jamaica, the UK and the UAE: short-stay (Airbnb) management and co-hosting, guaranteed rent / rent-to-rent, lettings and estate agency, property management and developments.
You are talking to ${o.c.name} (${o.c.isAdmin ? 'admin' : o.c.role || 'staff'}). It is ${now} (UK time).

How to answer:
- British English. Clear, direct and practical; short paragraphs, bullet points and markdown tables where they help. No waffle.
- For questions about the business, use ONLY the portal data below. Never invent properties, figures, names or dates; if something isn't in the data, say so and say where in the portal they could check.
- Mention which part of the portal a fact comes from when useful (e.g. "Estate Agency → Properties").
- Point out anything that looks wrong or risky (e.g. a rent that looks too low, a lease about to end).
- You can't change anything in the portal or send messages — you draft, and staff copy or open the right page.
- For legal, tax or financial questions give useful general information, be clear about the country (Jamaica vs UK rules differ) and suggest checking with a professional for the final decision.
- Don't include phone numbers or WhatsApp numbers in drafts unless the user gives them.`
  s += o.web ? `\n- You can search the web for current information (market rents, laws, news). Prefer recent, reputable sources and list the links you used at the end under "Sources".` : `\n- Web search is off: for current prices, rents, laws or news, say your information may be out of date and suggest switching on "Search the web".`
  if (o.deal) s += `\n\nTHE DEAL BEING DISCUSSED (from the Deal Analyser — figures are the user's inputs and the analyser's results):\n${JSON.stringify(o.deal, null, 1).slice(0, 12000)}\n\nWhen asked for your opinion: act as an experienced property investor. Give a clear view (would you do it, why / why not), the biggest risks, what to check before committing, what figures look optimistic or missing, and what would make it work (price, rent, terms to negotiate). If there is an AI Verdict above, say where you agree or disagree with it. Use the actual numbers. Remind them briefly that it's not financial advice only once, at the end.`
  if (o.portal) s += `\n\nPORTAL DATA (live, read-only):\n${o.portal}`
  else s += `\n\n(Portal data is switched off for this chat — answer generally.)`
  return s
}

export async function askClaude(system: string, messages: ChatMsg[], web: boolean): Promise<{ text?: string; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'The AI isn’t configured on the server' }
  const body: any = {
    model: 'claude-sonnet-4-6', max_tokens: 2000, system,
    messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
  }
  if (web) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { error: `The AI is unavailable right now (${res.status})` }
  const data = await res.json()
  const text = (data.content ?? []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('').trim()
  return text ? { text } : { error: 'The AI didn’t return an answer — try again.' }
}
