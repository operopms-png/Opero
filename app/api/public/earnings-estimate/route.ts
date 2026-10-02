import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/send-email'
import { addCrmLead, alertTeam } from '@/lib/crm-lead'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'
import { runEstimate, money, type Estimate } from '@/lib/earnings-estimate'

// "What could your property earn?" — the landlord earnings checker on
// sangstersgroup.com (public/sg-earnings.js) and app.sangstersgroup.com/earnings.
//   POST {name, email, phone, lives_in, location, country, property_type, bedrooms,
//         bathrooms, furnished, goal, rent_type, start_when, marketing_opt_in,
//         currency, consent, source, website(honeypot)}
// 1. saves the lead (Landlord Leads + CRM + team alert) straight away, so a
//    landlord is never lost even if the market search fails,
// 2. runs the AI estimate (live listings, holiday let + long let),
// 3. emails the landlord their estimate and returns it to the page.
// The reply streams spaces while the search runs so the connection stays open.

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const clean = (v: any, n = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const MEET = 'https://app.sangstersgroup.com/meeting'

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (b.website) return NextResponse.json({ ok: true, estimate: null }, { headers: CORS })
  const biz = LISTINGS_BUSINESS_ID
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40)
  const location = clean(b.location, 160), country = clean(b.country, 60) || 'Jamaica'
  const currency = (['USD', 'JMD', 'GBP'].includes(b.currency) ? b.currency : 'USD') as 'USD' | 'JMD' | 'GBP'
  const bedrooms = Math.min(20, Math.max(0, parseInt(b.bedrooms) || 0)) || null
  const bathrooms = Math.min(20, Math.max(0, parseFloat(b.bathrooms) || 0)) || null
  const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: CORS })
  if (!name) return err('Please add your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Please add a valid email address.')
  if (!location) return err('Please add where the property is.')
  if (!b.consent) return err('Please tick the box so we can send you your estimate.')

  // flood protection: per email and per connection, per day
  const ip = clean(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '', 60)
  const since = new Date(Date.now() - 864e5).toISOString()
  const [{ count: byEmail }, { count: byIp }] = await Promise.all([
    serviceClient.from('landlord_estimates').select('id', { count: 'exact', head: true }).eq('business_id', biz).ilike('email', email).gte('created_at', since),
    ip ? serviceClient.from('landlord_estimates').select('id', { count: 'exact', head: true }).eq('business_id', biz).eq('ip', ip).gte('created_at', since) : Promise.resolve({ count: 0 } as any),
  ])
  if ((byEmail ?? 0) >= 3 || (byIp ?? 0) >= 8) return err('You’ve already requested a few estimates today. Our team will be in touch — or book a call below.', 429)

  const row = {
    business_id: biz, name, email, phone: phone || null, lives_in: clean(b.lives_in, 60) || null,
    location, country, property_type: clean(b.property_type, 60) || null, bedrooms, bathrooms,
    furnished: clean(b.furnished, 30) || null, goal: clean(b.goal, 30) || null, currency,
    rent_type: clean(b.rent_type, 30) || null, start_when: clean(b.start_when, 30) || null, marketing_opt_in: b.marketing_opt_in === true,
    source: clean(b.source, 120) || 'Website', ip: ip || null,
  }
  const { data: saved, error: insErr } = await serviceClient.from('landlord_estimates').insert(row).select('id').single()
  if (insErr || !saved) return err('Sorry, something went wrong — please try again.', 500)

  const propLine = `${bedrooms ? `${bedrooms}-bed ` : ''}${(row.property_type || 'property').toLowerCase()} in ${location}${country ? `, ${country}` : ''}`
  const details = [
    `Property: ${propLine}`,
    row.bathrooms ? `Bathrooms: ${row.bathrooms}` : '',
    row.furnished ? `Furnished: ${row.furnished}` : '',
    row.goal ? `Interested in: ${row.goal}` : '',
    row.rent_type ? `Letting: ${row.rent_type}` : '',
    row.start_when ? `Start: ${row.start_when}` : '',
    `Marketing emails: ${row.marketing_opt_in ? 'yes' : 'no'}`,
    row.lives_in ? `Lives in: ${row.lives_in}` : '',
    `Phone: ${phone || '—'}`,
    `Source: ${row.source}`,
  ].filter(Boolean).join('\n')
  const contactId = await addCrmLead({ businessId: biz, name, email, phone, source: 'Earnings estimate', module: row.goal === 'Long-term let' || row.goal === 'Guaranteed rent' ? 'pm' : 'str', type: 'Landlord', notes: details, dealName: `${name} — ${propLine}`.slice(0, 200) }).catch(() => null)
  if (contactId) await serviceClient.from('landlord_estimates').update({ crm_contact_id: contactId }).eq('id', saved.id)
  const alertTo = await alertTeam(biz, `New landlord lead: ${name} — ${propLine}`, `${name} <${email}>${phone ? ` · ${phone}` : ''}\n${details}`, '/staff-centre/landlord-leads', email).catch(() => undefined)

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctl) {
      const tick = setInterval(() => { try { ctl.enqueue(enc.encode(' ')) } catch {} }, 4000)
      let estimate: Estimate | null = null
      try { estimate = await runEstimate({ location, country, propertyType: row.property_type, bedrooms, bathrooms, furnished: row.furnished, currency }) } catch {}
      const okEst = estimate && (estimate.short_let?.monthly_typical || estimate.long_let?.monthly_typical)
      await serviceClient.from('landlord_estimates').update(okEst ? { estimate, updated_at: new Date().toISOString() } : { estimate_error: 'No market data came back', updated_at: new Date().toISOString() }).eq('id', saved.id)
      if (okEst) await sendEmail(email, 'Your property earnings estimate', estimateEmail(name, propLine, estimate!), alertTo).catch(() => {})
      clearInterval(tick)
      ctl.enqueue(enc.encode(JSON.stringify({ ok: true, estimate: okEst ? estimate : null, meetUrl: MEET })))
      ctl.close()
    },
  })
  return new Response(stream, { headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
}

function estimateEmail(name: string, propLine: string, e: Estimate) {
  const c = e.currency
  const row = (label: string, main: string, sub: string) => `<tr><td style="padding:14px 16px;border-bottom:1px solid #ece8df"><div style="font-size:12px;color:#6b675e;text-transform:uppercase;letter-spacing:.06em">${label}</div><div style="font-size:24px;font-weight:700;color:#191815;margin-top:2px">${main}</div><div style="font-size:12.5px;color:#6b675e">${sub}</div></td></tr>`
  const s = e.short_let, l = e.long_let
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#323338;max-width:560px">
<p>Dear ${esc(name.split(' ')[0])},</p>
<p>Thank you for using our earnings checker. Here is what your <b>${esc(propLine)}</b> could earn, based on live listings near you:</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #ece8df;border-radius:6px">
${s?.monthly_typical ? row('As a holiday let (per month)', money(s.monthly_typical, c), `${money(s.monthly_low, c)} – ${money(s.monthly_high, c)} · about ${money(s.nightly_typical, c)} a night at ${s.occupancy_pct ?? '—'}% occupancy`) : ''}
${l?.monthly_typical ? row('As a long-term let (per month)', money(l.monthly_typical, c), `${money(l.monthly_low, c)} – ${money(l.monthly_high, c)}`) : ''}
</table>
<p style="font-size:12px;color:#8a857a">These are estimates from current listings, before management fees and running costs. A free valuation gives you a firm figure.</p>
<p><a href="${MEET}" style="display:inline-block;background:#191815;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:700">Book a free valuation call</a></p>
<p>Kind regards,<br>The Sangsters team</p></div>`
}
