import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'

// Staff Centre → Client Properties. Every property a client brings to us,
// before it is signed.
//   GET                         -> { properties }            (list, newest first)
//   GET ?id=…                   -> { property, crmLink }      (one, with CRM deep link)
//   POST {action:'create', …fields, note?}       -> { property }
//   POST {action:'update', id, …fields}          -> { property }
//   POST {action:'note', id, text, kind?}        -> { property }
//   POST {action:'numbers', id, numbers}         -> { property }   (from the Deal Analyser)
//   POST {action:'convert', id, to:'pm'|'vr'|'none'} -> { property, link }
//   POST {action:'delete', id}                   -> { ok }
// Each property gets a CRM contact (the owner) and a CRM deal whose stage and
// value follow the property (the deal shows on the CRM transactions board).

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const STAGES = ['new', 'viewing', 'numbers', 'offer', 'signed', 'passed']
const STAGE_LABEL: Record<string, string> = { new: 'New', viewing: 'Viewing', numbers: 'Numbers done', offer: 'Offer made', signed: 'Signed', passed: 'Passed' }
const SERVICES = ['sell', 'guaranteed_rent', 'partnership', 'airbnb', 'long_let', 'unsure']
const SERVICE_LABEL: Record<string, string> = { sell: 'Sell', guaranteed_rent: 'Guaranteed rent', partnership: 'Partnership management', airbnb: 'Airbnb management', long_let: 'Long let', unsure: 'Not sure yet' }
// crm_deals.stage → CRM board status (see crm_deal_status_label in the DB)
const CRM_STAGE: Record<string, string> = { new: '', viewing: '', numbers: '', offer: 'offer', signed: 'won', passed: 'lost' }
const CRM_MODULE: Record<string, string> = { sell: 'estate', airbnb: 'str' }

const TEXT = ['address', 'area', 'subarea', 'country', 'price_text', 'currency', 'style', 'amenities', 'description', 'mls', 'source_url', 'owner_name', 'owner_phone', 'owner_email', 'referred_by', 'agent']
const NUM = ['price', 'bedrooms', 'bathrooms', 'sqft', 'lot_sqft', 'lot_acres']

function clean(b: any) {
  const out: any = {}
  for (const k of TEXT) if (b[k] !== undefined) out[k] = b[k] === null ? null : String(b[k]).trim().slice(0, k === 'description' ? 8000 : 500) || null
  for (const k of NUM) if (b[k] !== undefined) { const v = parseFloat(String(b[k] ?? '').replace(/[^0-9.]/g, '')); out[k] = Number.isFinite(v) ? v : null }
  if (b.price_is_rent !== undefined) out.price_is_rent = !!b.price_is_rent
  if (b.service !== undefined) out.service = SERVICES.includes(b.service) ? b.service : null
  if (b.stage !== undefined && STAGES.includes(b.stage)) out.stage = b.stage
  if (Array.isArray(b.photos)) out.photos = b.photos.filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 80)
  if (Array.isArray(b.documents)) out.documents = b.documents.filter((d: any) => d && typeof d.url === 'string').slice(0, 50).map((d: any) => ({ name: String(d.name || 'File').slice(0, 200), url: d.url, path: d.path || null, size: d.size || null, at: d.at || new Date().toISOString() }))
  if (b.listing !== undefined) out.listing = b.listing && typeof b.listing === 'object' ? b.listing : null
  return out
}

const entry = (by: string, kind: string, text: string) => ({ at: new Date().toISOString(), by, kind, text: text.slice(0, 2000) })

async function syncCrm(p: any) {
  const name = `${p.address}${p.subarea ? ', ' + p.subarea : ''}${p.service ? ' · ' + SERVICE_LABEL[p.service] : ''}`.slice(0, 200)
  let contactId = p.crm_contact_id
  if (!contactId) {
    if (p.owner_email) {
      const { data: ex } = await serviceClient.from('crm_contacts').select('id').eq('user_id', p.business_id).ilike('email', p.owner_email).limit(1)
      contactId = ex?.[0]?.id ?? null
    }
    if (!contactId) {
      const { data } = await serviceClient.from('crm_contacts').insert({ user_id: p.business_id, name: p.owner_name, email: p.owner_email || null, phone: p.owner_phone || null, source: p.referred_by ? `Client property · ${p.referred_by}` : 'Client property', module: CRM_MODULE[p.service] || 'pm', type: 'Owner', status: 'prospect', notes: `Owner of ${p.address}` }).select('id').single()
      contactId = data?.id ?? null
    }
  }
  let dealId = p.crm_deal_id
  const deal = { name, contact_id: contactId, stage: CRM_STAGE[p.stage] ?? '', value: p.price ?? null, module: CRM_MODULE[p.service] || 'pm' }
  if (dealId) await serviceClient.from('crm_deals').update(deal).eq('id', dealId)
  else { const { data } = await serviceClient.from('crm_deals').insert({ user_id: p.business_id, ...deal }).select('id').single(); dealId = data?.id ?? null }
  if (contactId !== p.crm_contact_id || dealId !== p.crm_deal_id) {
    const { data } = await serviceClient.from('client_properties').update({ crm_contact_id: contactId, crm_deal_id: dealId }).eq('id', p.id).select('*').single()
    return data ?? p
  }
  return p
}

export async function GET(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const { data: property } = await serviceClient.from('client_properties').select('*').eq('id', id).eq('business_id', c.businessId).maybeSingle()
    if (!property) return bad('Property not found', 404)
    let crmLink: string | null = null
    if (property.crm_deal_id) {
      const { data: it } = await serviceClient.from('crm_board_items').select('id,board_id').eq('crm_deal_id', property.crm_deal_id).maybeSingle()
      if (it) crmLink = `/staff-centre/crm?board=${it.board_id}&item=${it.id}`
    }
    return NextResponse.json({ property, crmLink })
  }
  const { data, error } = await serviceClient.from('client_properties').select('*').eq('business_id', c.businessId).order('created_at', { ascending: false }).limit(500)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ properties: data ?? [] })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return bad('Not signed in', 401)
  const b = await req.json().catch(() => ({}))
  const by = c.name || c.email

  if (b.action === 'create') {
    const f = clean(b)
    if (!f.address) return bad('Add the property address (or import a listing link).')
    if (!f.owner_name) return bad('Add the owner’s name.')
    const activity = [] as any[]
    if (b.note && String(b.note).trim()) activity.push(entry(by, 'note', String(b.note).trim()))
    if (f.source_url) activity.push(entry(by, 'import', `Imported from ${f.mls ? 'MLS# ' + f.mls : 'a listing link'}${f.agent ? ' (agent: ' + f.agent + ')' : ''}`))
    activity.push(entry(by, 'created', `Added — ${f.service ? SERVICE_LABEL[f.service] : 'service not chosen yet'}${f.referred_by ? ', came via ' + f.referred_by : ''}`))
    const { data, error } = await serviceClient.from('client_properties').insert({ ...f, business_id: c.businessId, created_by: by, stage: 'new', activity }).select('*').single()
    if (error) return bad(error.message, 500)
    const property = await syncCrm(data).catch(() => data)
    return NextResponse.json({ property })
  }

  const { data: p } = await serviceClient.from('client_properties').select('*').eq('id', String(b.id || '')).eq('business_id', c.businessId).maybeSingle()
  if (!p) return bad('Property not found', 404)
  const save = async (patch: any) => {
    const { data, error } = await serviceClient.from('client_properties').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.id).select('*').single()
    if (error) throw new Error(error.message)
    return data
  }

  try {
    if (b.action === 'update') {
      const f = clean(b)
      const log: any[] = []
      if (f.stage && f.stage !== p.stage) { log.push(entry(by, 'stage', `Stage: ${STAGE_LABEL[p.stage]} → ${STAGE_LABEL[f.stage]}`)); if (f.stage === 'signed') f.signed_at = new Date().toISOString() }
      if (f.service !== undefined && f.service !== p.service) log.push(entry(by, 'service', `Service: ${SERVICE_LABEL[f.service] || '—'}`))
      if (f.photos && f.photos.length > (p.photos || []).length) log.push(entry(by, 'photos', `Added ${f.photos.length - (p.photos || []).length} photo(s)`))
      if (f.documents && f.documents.length > (p.documents || []).length) log.push(entry(by, 'document', `Uploaded ${f.documents.slice((p.documents || []).length).map((d: any) => d.name).join(', ')}`))
      let property = await save({ ...f, activity: [...log, ...(p.activity || [])].slice(0, 300) })
      property = await syncCrm(property).catch(() => property)
      return NextResponse.json({ property })
    }

    if (b.action === 'note') {
      const text = String(b.text || '').trim()
      if (!text) return bad('Write a note first.')
      const kind = ['note', 'call', 'viewing', 'offer'].includes(b.kind) ? b.kind : 'note'
      const property = await save({ activity: [entry(by, kind, text), ...(p.activity || [])].slice(0, 300) })
      return NextResponse.json({ property })
    }

    if (b.action === 'numbers') {
      const n = b.numbers && typeof b.numbers === 'object' ? b.numbers : null
      if (!n) return bad('No numbers to save.')
      const numbers = { ...n, at: new Date().toISOString(), by }
      const patch: any = { numbers, activity: [entry(by, 'numbers', `Numbers run: ${n.strategyLabel || n.strategy}${n.score ? ' — ' + n.score + ' deal' : ''}`), ...(p.activity || [])].slice(0, 300) }
      if (['new', 'viewing'].includes(p.stage)) patch.stage = 'numbers'
      let property = await save(patch)
      property = await syncCrm(property).catch(() => property)
      return NextResponse.json({ property })
    }

    if (b.action === 'convert') {
      const to = b.to
      const photos: string[] = p.photos || []
      let link: string | null = null, convertedId: string | null = null, where = ''
      if (to === 'pm') {
        let ownerId: string | null = null
        if (p.owner_email) { const { data: ex } = await serviceClient.from('pm_landlords').select('id').eq('user_id', c.businessId).ilike('email', p.owner_email).limit(1); ownerId = ex?.[0]?.id ?? null }
        if (!ownerId) { const { data: l, error } = await serviceClient.from('pm_landlords').insert({ user_id: c.businessId, name: p.owner_name, email: p.owner_email || null, phone: p.owner_phone || null, notes: p.referred_by ? `Came via ${p.referred_by}` : null }).select('id').single(); if (error) return bad(error.message, 500); ownerId = l.id }
        const { data: pm, error } = await serviceClient.from('pm_properties').insert({
          user_id: c.businessId, name: p.address, address: [p.address, p.subarea, p.area].filter(Boolean).join(', '), city: p.subarea || p.area || null,
          country: p.country || 'Jamaica', owner_id: ownerId, status: 'Available', monthly_income: p.price_is_rent ? p.price : null,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : null, bathrooms: p.bathrooms != null ? String(p.bathrooms) : null,
          image_urls: photos.length ? JSON.stringify(photos.slice(0, 40)) : null,
        }).select('id').single()
        if (error) return bad(error.message, 500)
        convertedId = pm.id; link = '/pm'; where = 'Property Management'
      } else if (to === 'vr') {
        const slug = (p.address + '-' + (p.subarea || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + p.id.slice(0, 4)
        const { data: vr, error } = await serviceClient.from('properties').insert({
          user_id: c.businessId, name: p.address, slug, address: [p.address, p.subarea, p.area].filter(Boolean).join(', '), city: p.subarea || null,
          country: p.country || 'Jamaica', location: p.area || null, status: 'inactive', show_on_website: false,
          bedrooms: p.bedrooms != null ? Math.round(p.bedrooms) : null, bathrooms: p.bathrooms != null ? Math.round(p.bathrooms) : null,
          image_url: photos[0] || null, description: p.description || null,
        }).select('id').single()
        if (error) return bad(error.message, 500)
        convertedId = vr.id; link = '/properties'; where = 'Vacation Rentals (set to Inactive until it’s ready)'
      } else if (to !== 'none') return bad('Unknown destination')
      let property = await save({
        stage: 'signed', signed_at: new Date().toISOString(), converted_to: to === 'none' ? null : to, converted_id: convertedId,
        activity: [entry(by, 'signed', `Signed${where ? ' — added to ' + where : ''}`), ...(p.activity || [])].slice(0, 300),
      })
      property = await syncCrm(property).catch(() => property)
      return NextResponse.json({ property, link })
    }

    if (b.action === 'delete') {
      await serviceClient.from('client_properties').delete().eq('id', p.id)
      return NextResponse.json({ ok: true })
    }
  } catch (e: any) {
    return bad(e.message || 'Something went wrong', 500)
  }
  return bad('Unknown action')
}
