export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, airbnb_ical_url, vrbo_ical_url, booking_ical_url')

    if (!properties?.length) return NextResponse.json({ synced: [] })

    const results = []

    for (const property of properties) {
      const urls = [
        { url: property.airbnb_ical_url, source: 'airbnb' },
        { url: property.vrbo_ical_url, source: 'vrbo' },
        { url: property.booking_ical_url, source: 'booking' },
      ].filter(u => u.url)

      if (!urls.length) continue

      for (const { url, source } of urls) {
        try {
          const res = await fetch(url)
          const text = await res.text()
          const events = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []

          for (const event of events) {
            const dtstart = event.match(/DTSTART[^:]*:(\S+)/)?.[1]
            const dtend = event.match(/DTEND[^:]*:(\S+)/)?.[1]
            const summary = event.match(/SUMMARY:(.*)/)?.[1]?.trim()
            const uid = event.match(/UID:(.*)/)?.[1]?.trim()

            if (dtstart && dtend && uid) {
              await supabase.from('bookings').upsert({
                property_id: property.id,
                check_in: dtstart.slice(0, 10),
                check_out: dtend.slice(0, 10),
                guest_name: summary || `${source} booking`,
                platform: source,
                source: 'ical',
                external_id: uid,
                status: 'confirmed',
              }, { onConflict: 'external_id' })
            }
          }
          results.push({ property: property.name, source, events: events.length })
        } catch (e) {
          results.push({ property: property.name, source, error: String(e) })
        }
      }
    }

    return NextResponse.json({ synced: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
