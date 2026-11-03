import { NextRequest } from 'next/server'
import { requireUser, serviceClient as db } from '@/lib/admin-auth'
import { aiTask, aiTaskBy, companyName } from '@/lib/ai-proposal-utils'
import { sendEmail } from '@/lib/send-email'

// GET (signed in)        -> this client's agent link token (created on first use)
// GET ?token=...         -> public: the company name to show on the form
// POST (public) {token, ...deal} -> a local agent or partner submits a deal into the client's pipeline at "Found"
const j = (o: any, status = 200) => Response.json(o, { status })
const clip = (v: any, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const num = (v: any) => { const x = Number(String(v ?? '').replace(/[, ]/g, '')); return Number.isFinite(x) && x > 0 ? x : null }
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token) {
    const { data } = await db.from('deal_submit_links').select('user_id, active').eq('token', token).maybeSingle()
    if (!data || !data.active) return j({ error: 'This link is not active.' }, 404)
    return j({ company: await companyName(data.user_id) })
  }
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  let { data } = await db.from('deal_submit_links').select('token, active').eq('user_id', uid).maybeSingle()
  if (!data) { const r = await db.from('deal_submit_links').insert({ user_id: uid }).select('token, active').single(); data = r.data }
  return j({ token: data?.token, active: data?.active })
}

export async function PATCH(req: NextRequest) {
  const uid = await requireUser(req)
  if (!uid) return j({ error: 'Not signed in' }, 401)
  const b = await req.json().catch(() => ({}))
  if (b.regenerate) {
    await db.from('deal_submit_links').delete().eq('user_id', uid)
    const r = await db.from('deal_submit_links').insert({ user_id: uid }).select('token, active').single()
    return j({ token: r.data?.token, active: r.data?.active })
  }
  await db.from('deal_submit_links').update({ active: !!b.active }).eq('user_id', uid)
  return j({ success: true })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return j({ success: true }) // honeypot: bots fill this in, people never see it
  const { data: link } = await db.from('deal_submit_links').select('user_id, active').eq('token', clip(b.token, 100)).maybeSingle()
  if (!link || !link.active) return j({ error: 'This link is not active.' }, 404)
  const uid = link.user_id as string

  const name = clip(b.name, 120), email = clip(b.email, 160), phone = clip(b.phone, 40)
  const address = clip(b.address, 200), price = num(b.price)
  if (!name || (!email && !phone)) return j({ error: 'Add your name and an email or phone number.' }, 400)
  if (!address || !price) return j({ error: 'Add the property address and asking price.' }, 400)
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return j({ error: 'That email address does not look right.' }, 400)

  // Basic abuse limit: at most 20 agent submissions an hour per client
  const since = new Date(Date.now() - 3600000).toISOString()
  const { count } = await db.from('investment_deals').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('data->>source', 'agent').gte('created_at', since)
  if ((count ?? 0) >= 20) return j({ error: 'Too many submissions right now. Please try again later.' }, 429)

  const currency = ['GBP', 'JMD', 'USD'].includes(b.currency) ? b.currency : 'JMD'
  const strategy = ['btl', 'brrr', 'hmo', 'r2r', 'flip', 'land'].includes(b.strategy) ? b.strategy : 'btl'
  const rent = num(b.rent)
  const form: Record<string, any> = { address, price: String(price), currency, bedrooms: b.beds ? String(num(b.beds) ?? '') : '', ...(rent ? { rent: String(rent) } : {}), listingUrl: clip(b.url, 400) }
  const submittedBy = { name, company: clip(b.company, 120), email, phone, notes: clip(b.notes, 1500), propertyType: clip(b.propertyType, 60) }
  const { error } = await db.from('investment_deals').insert({ user_id: uid, strategy, address, stage: 'Found', data: { form, source: 'agent', submittedBy, listingUrl: form.listingUrl } })
  if (error) return j({ error: 'Could not save this right now. Please try again.' }, 500)

  await aiTaskBy('deal_submit', uid, `New deal from ${name}: ${address}`, `${submittedBy.company ? submittedBy.company + '. ' : ''}${currency} ${price.toLocaleString('en-GB')}. ${email || phone}. Open Deal Analyser → Saved Deals (stage Found).`, 1).catch(() => {})
  const { data: owner } = await db.auth.admin.getUserById(uid)
  if (owner?.user?.email) {
    await sendEmail(owner.user.email, `New deal submitted: ${address}`,
      `<p><b>${esc(name)}</b>${submittedBy.company ? ' (' + esc(submittedBy.company) + ')' : ''} submitted a deal.</p><p>${esc(address)}<br>${currency} ${price.toLocaleString('en-GB')}${rent ? ' · rent ' + rent.toLocaleString('en-GB') + ' a month' : ''}</p>${submittedBy.notes ? '<p>' + esc(submittedBy.notes).replace(/\n/g, '<br>') + '</p>' : ''}<p>Contact: ${esc(email || phone)}</p><p>It is in Deal Analyser → Saved Deals at the Found stage.</p>`, email || undefined).catch(() => {})
  }
  return j({ success: true })
}
