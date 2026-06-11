export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: properties } = await supabase.from('properties').select('id, name, ical_url')
    if (!properties?.length) return NextResponse.json({ message: 'No properties with iCal URLs' })
    const results = []
    for (const property of properties) {
      if (!property.ical_url) continue
      try {
        const res = await fetch(property.ical_url)
        const text = await res.text()
        const events = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []
        for (const event of events) {
          const dtstart = event.match(/DTSTART[^:]*:(\S+)/)?.[1]
          const dtend = event.match(/DTEND[^:]*:(\S+)/)?.[1]
          const summary = event.match(/SUMMARY:(.*)/)?.[1]?.trim()
          const uid = event.match(/UID:(.*)/)?.[1]?.trim()
          if (dtstart && dtend) {
            await supabase.from('bookings').upsert({
              property_id: property.id,
              check_in: dtstart.slice(0, 10),
              check_out: dtend.slice(0, 10),
              guest_name: summary || 'iCal booking',
              source: 'ical',
              external_id: uid,
            }, { onConflict: 'external_id' })
          }
        }
        results.push({ property: property.name, events: events.length })
      } catch (e) {
        results.push({ property: property.name, error: String(e) })
      }
    }
    return NextResponse.json({ synced: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
