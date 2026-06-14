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
    const { name, email, phone, postcode, bedrooms, source, module, type, api_key } = body

    if (!api_key) return NextResponse.json({ error: 'Missing API key' }, { status: 401, headers })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('api_key', api_key)
      .single()

    if (!sub) return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers })

    await supabase.from('crm_contacts').insert([{
      user_id: sub.user_id,
      name: name ?? 'Unknown',
      email: email ?? null,
      phone: phone ?? null,
      source: source ?? 'Website',
      module: module ?? 'str',
      type: type ?? 'guest',
      status: 'prospect',
      notes: postcode ? `Postcode: ${postcode}${bedrooms ? `, Bedrooms: ${bedrooms}` : ''}` : null,
    }])

    return NextResponse.json({ success: true }, { headers })
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers })
}
