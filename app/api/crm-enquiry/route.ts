import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, postcode, bedrooms, source, module, type } = body

    await supabase.from('crm_contacts').insert([{
      name: name ?? 'Unknown',
      email: email ?? null,
      phone: phone ?? null,
      source: source ?? 'Website',
      module: module ?? 'str',
      type: type ?? 'guest',
      status: 'prospect',
      notes: postcode ? `Postcode: ${postcode}${bedrooms ? `, Bedrooms: ${bedrooms}` : ''}` : null,
    }])

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
