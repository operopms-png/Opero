import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MODULES = ['str', 'pm', 'ea', 'dev']
const clip = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

// Website enquiry form -> CRM. The api_key (Settings -> API key, one per account)
// decides WHICH account the contact lands in; without a valid key nothing is written.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers })

    const apiKey = clip(body.api_key, 100)
    if (!apiKey) return NextResponse.json({ success: false, error: 'api_key is required' }, { status: 401, headers })
    const { data: sub, error: subError } = await supabase.from('subscriptions').select('user_id').eq('api_key', apiKey).limit(1).maybeSingle()
    if (subError) { console.error('crm-enquiry: api key lookup failed', subError); return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers }) }
    if (!sub?.user_id) return NextResponse.json({ success: false, error: 'Invalid api_key' }, { status: 401, headers })
    const ownerId: string = sub.user_id

    const name = clip(body.name, 200)
    const email = clip(body.email, 200)
    const phone = clip(body.phone, 50)
    if (!name && !email && !phone) return NextResponse.json({ success: false, error: 'Provide at least a name, email or phone' }, { status: 400, headers })
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400, headers })

    const postcode = clip(body.postcode, 20), bedrooms = clip(String(body.bedrooms ?? ''), 20)
    const address1 = clip(body.address1, 200), town = clip(body.town, 100), county = clip(body.county, 100)
    const status = clip(body.status, 100), priceRange = clip(body.priceRange, 100), comments = clip(body.comments, 2000)
    const marketingConsent = clip(String(body.marketingConsent ?? ''), 20)
    const issue = clip(body.issue, 300), urgency = clip(body.urgency, 100), description = clip(body.description, 2000)
    const propertyName = clip(body.propertyName, 200), accessNotes = clip(body.accessNotes, 1000)
    const module = MODULES.includes(body.module) ? body.module : 'str'
    const type = clip(body.type, 50) ?? 'guest'
    const source = clip(body.source, 100) ?? 'Website'

    const noteLines = [
      address1 ? `Address: ${address1}${town ? `, ${town}` : ''}${county ? `, ${county}` : ''}${postcode ? `, ${postcode}` : ''}` : (postcode ? `Postcode: ${postcode}` : null),
      bedrooms ? `Bedrooms: ${bedrooms}` : null,
      status ? `Current status: ${status}` : null,
      priceRange ? `Price range: ${priceRange}` : null,
      marketingConsent ? `Marketing opt-in: ${marketingConsent}` : null,
      comments ? `Comments: ${comments}` : null,
      propertyName ? `Property / Unit: ${propertyName}` : null,
      issue ? `Issue: ${issue}` : null,
      urgency ? `Urgency: ${urgency}` : null,
      description ? `Description: ${description}` : null,
      accessNotes ? `Access notes: ${accessNotes}` : null,
    ].filter(Boolean)

    const { data: inserted, error: insertError } = await supabase.from('crm_contacts').insert([{
      user_id: ownerId,
      name: name ?? 'Unknown',
      email,
      phone,
      source,
      module,
      type,
      status: 'prospect',
      notes: noteLines.length ? noteLines.join('\n') : null,
    }]).select().single()

    if (insertError) {
      console.error('crm-enquiry: contact insert failed', insertError)
      return NextResponse.json({ success: false, error: 'Could not save enquiry' }, { status: 500, headers })
    }

    // Also drop a matching Deal into the Enquiry stage so Pipeline reflects new leads automatically
    const dealLabel = issue ? `${name ?? 'Unknown'} — ${issue}` : `${name ?? 'Unknown'} — ${type ?? 'Enquiry'}`
    const { error: dealError } = await supabase.from('crm_deals').insert([{
      user_id: ownerId,
      name: dealLabel,
      contact_id: inserted?.id ?? null,
      module,
      stage: 'Enquiry',
      value: null,
    }])
    if (dealError) console.error('crm-enquiry: deal insert failed', dealError)

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    console.error('crm-enquiry: unexpected error', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers })
}
