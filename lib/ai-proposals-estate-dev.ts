// Scheduled AI agents for estate agency and developments. Like every agent, they only draft
// into the approvals queue; nothing is sent or changed until a person approves it.
//   ea_viewings   : reminder the day before a viewing, follow-up after it
//   ea_listings   : first-draft website description for listings that have none
//   dev_investors : monthly progress update to each investor
import { callClaude } from './claude'
import { queueAiAction } from './ai-approvals'
import { styleInstructions } from './ai-style'
import { svc, freshCounts, enabledBusinesses, companyName, dayStr, niceDate, firstName } from './ai-proposal-utils'

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
const monthStart = () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
const done = (r: any, q: any) => { if ('queued' in q) r.queued++; else { r.skipped++; if ('error' in q) r.errors.push(q.error) } }

// ---------- viewings ----------
export async function proposeViewings() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('ea_viewings')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: views } = await db.from('estate_viewings').select('id, property_id, prospect_name, prospect_email, scheduled_at, status')
      .eq('user_id', businessId).gte('scheduled_at', dayStr(-3)).lt('scheduled_at', dayStr(2))
    for (const v of (views ?? []).filter((x: any) => !/cancel|no.?show/i.test(String(x.status ?? '')))) {
      if (!v.prospect_email) { result.noRecipient++; continue }
      const { data: prop } = await db.from('estate_properties').select('name, address').eq('id', v.property_id).eq('user_id', businessId).maybeSingle()
      const where = prop?.name || prop?.address || 'the property'
      const hi = firstName(v.prospect_name) ? `Dear ${firstName(v.prospect_name)},` : 'Hello,'
      const when = v.scheduled_at.slice(0, 10)
      const upcoming = new Date(v.scheduled_at).getTime() > Date.now()

      if (upcoming) {
        const body = `${hi}\n\nThis is a reminder of your viewing of ${where} on ${niceDate(when)} at ${clock(v.scheduled_at)}.\n\nIf you can no longer make it, or would like to change the time, please reply and we will rearrange.\n\nKind regards,\n${sign}`
        const q = await queueAiAction({
          userId: businessId, agentKey: 'ea_viewings', actionType: 'email_out',
          title: `Viewing reminder: ${v.prospect_name || 'prospect'}`, propertyName: where, draftBody: body,
          payload: { to: v.prospect_email, subject: `Your viewing of ${where}`, viewing_id: `${v.id}:reminder` },
          context: { summary: `Viewing ${niceDate(when)} ${clock(v.scheduled_at)} · will be emailed to ${v.prospect_name || v.prospect_email}` },
          dedupe: { key: 'viewing_id', value: `${v.id}:reminder` },
        })
        done(result, q)
      } else {
        const body = `${hi}\n\nThank you for viewing ${where}. We would love to know what you thought of it.\n\nIf you would like to go ahead, or if you have any questions or would like a second viewing, please reply and we will take the next steps with you.\n\nKind regards,\n${sign}`
        const q = await queueAiAction({
          userId: businessId, agentKey: 'ea_viewings', actionType: 'email_out',
          title: `Viewing follow-up: ${v.prospect_name || 'prospect'}`, propertyName: where, draftBody: body,
          payload: { to: v.prospect_email, subject: `Following your viewing of ${where}`, viewing_id: `${v.id}:followup` },
          context: { summary: `Viewed ${niceDate(when)} · will be emailed to ${v.prospect_name || v.prospect_email}` },
          dedupe: { key: 'viewing_id', value: `${v.id}:followup` },
        })
        done(result, q)
      }
    }
  }
  return result
}

// ---------- listing descriptions ----------
// Writes only from the details on the record. Approving saves it as the listing description.
export async function proposeListings() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('ea_listings')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    const { data: props } = await db.from('estate_properties').select('id, name, address, type, bedrooms, bathrooms, rent, currency, features, available_from, description')
      .eq('user_id', businessId).limit(200)
    const todo = (props ?? []).filter((p: any) => !String(p.description ?? '').trim()).slice(0, 10)
    for (const p of todo) {
      const facts = [
        p.type && `Type: ${p.type}`, p.bedrooms != null && `Bedrooms: ${p.bedrooms}`, p.bathrooms != null && `Bathrooms: ${p.bathrooms}`,
        p.address && `Address: ${p.address}`, p.rent && `Rent: ${p.currency || 'GBP'} ${p.rent}`,
        p.features && `Features: ${Array.isArray(p.features) ? p.features.join(', ') : p.features}`, p.available_from && `Available from: ${p.available_from}`,
      ].filter(Boolean).join('\n')
      if (!facts) { result.skipped++; continue }
      const system = `You write property listing descriptions for an estate agency website. Use only the facts given below. Do not invent features, views, transport links, distances or condition. 80 to 120 words, plain professional English, no emojis, no exclamation marks.\n\n${facts}${await styleInstructions(businessId)}`
      const { text, error } = await callClaude(system, 'Write the listing description.', 400)
      if (error || !text) { result.errors.push(`${p.name}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'ea_listings', actionType: 'listing_description',
        title: `Listing description: ${p.name || p.address}`, propertyName: p.name || p.address, draftBody: text,
        payload: { property_id: p.id },
        context: { summary: 'Written only from the details on the property record. Approving saves it as the listing description.' },
        dedupe: { key: 'property_id', value: p.id, sinceIso: dayStr(-30) },
      })
      done(result, q)
    }
  }
  return result
}

// ---------- investor updates ----------
export async function proposeInvestorUpdates() {
  const db = svc()
  const result = freshCounts()
  const businesses = await enabledBusinesses('dev_investors')
  result.businesses = businesses.length

  for (const businessId of businesses) {
    const sign = await companyName(businessId)
    const { data: investors } = await db.from('dev_investors').select('id, name, email, project_id, status').eq('user_id', businessId)
    for (const inv of (investors ?? []).filter((i: any) => i.project_id && !/exit|closed|withdrawn/i.test(String(i.status ?? '')))) {
      if (!inv.email) { result.noRecipient++; continue }
      const [{ data: proj }, { data: snags }] = await Promise.all([
        db.from('dev_projects').select('name, status, start_date, end_date, total_budget, spent').eq('id', inv.project_id).eq('user_id', businessId).maybeSingle(),
        db.from('dev_snagging').select('status').eq('project_id', inv.project_id).eq('user_id', businessId),
      ])
      if (!proj) { result.skipped++; continue }
      const open = (snags ?? []).filter((s: any) => !/clos|resolv|complet|done/i.test(String(s.status ?? ''))).length
      const facts = `Project: ${proj.name}\nStatus: ${proj.status ?? 'not set'}\nStart: ${proj.start_date ?? 'not set'}\nTarget completion: ${proj.end_date ?? 'not set'}\nBudget: ${proj.total_budget ?? 'not set'}\nSpent so far: ${proj.spent ?? 'not set'}\nOpen snagging items: ${open}`
      const system = `You draft a short, factual monthly progress update email from a property developer to an investor. Use only the facts below. Do not predict returns, promise dates or invent progress. If a figure says "not set", leave it out. Plain professional English, no emojis, under 150 words, end by inviting questions.\n\nInvestor: ${inv.name}\n${facts}${await styleInstructions(businessId)}`
      const { text, error } = await callClaude(system, 'Draft the update email body (no subject line).', 450)
      if (error || !text) { result.errors.push(`${inv.name}: ${error ?? 'no text'}`); continue }
      const q = await queueAiAction({
        userId: businessId, agentKey: 'dev_investors', actionType: 'email_out',
        title: `Investor update: ${inv.name}`, propertyName: proj.name, draftBody: `${text}\n\nKind regards,\n${sign}`,
        payload: { to: inv.email, subject: `Progress update: ${proj.name}`, investor_id: inv.id },
        context: { summary: `${proj.name}: status ${proj.status ?? 'n/a'}, ${open} open snags · will be emailed to ${inv.name}. Check the figures before approving.` },
        dedupe: { key: 'investor_id', value: inv.id, sinceIso: monthStart() },
      })
      done(result, q)
    }
  }
  return result
}
