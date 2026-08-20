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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, email, phone, postcode, bedrooms, source, module, type,
      address1, town, county, status, priceRange, comments, marketingConsent
    } = body

    const noteLines = [
      address1 ? `Address: ${address1}${town ? `, ${town}` : ''}${county ? `, ${county}` : ''}${postcode ? `, ${postcode}` : ''}` : (postcode ? `Postcode: ${postcode}` : null),
      bedrooms ? `Bedrooms: ${bedrooms}` : null,
      status ? `Current status: ${status}` : null,
      priceRange ? `Price range: ${priceRange}` : null,
      marketingConsent ? `Marketing opt-in: ${marketingConsent}` : null,
      comments ? `Comments: ${comments}` : null,
    ].filter(Boolean)

    const { data: inserted, error: insertError } = await supabase.from('crm_contacts').insert([{
      user_id: 'bd780fdd-15e3-4306-8c87-788b23647ee5',
      name: name ?? 'Unknown',
      email: email ?? null,
      phone: phone ?? null,
      source: source ?? 'Website',
      module: module ?? 'str',
      type: type ?? 'guest',
      status: 'prospect',
      notes: noteLines.length ? noteLines.join('\n') : null,
    }]).select().single()

    if (insertError) throw insertError

    // Also drop a matching Deal into the Enquiry stage so Pipeline reflects new leads automatically
    await supabase.from('crm_deals').insert([{
      user_id: 'bd780fdd-15e3-4306-8c87-788b23647ee5',
      name: `${name ?? 'Unknown'} — ${type ?? 'Enquiry'}`,
      contact_id: inserted?.id ?? null,
      module: module ?? 'str',
      type: (module === 'estate') ? 'Let' : 'Sale',
      stage: 'Enquiry',
      value: null,
    }])

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers })
}
