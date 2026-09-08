// Shared logic for the iCal channel sync -- pulls booking dates from
// each property's Airbnb/VRBO/Booking.com iCal export URL so it
// doesn't get double-booked. One-way only (can't push price/
// availability out -- that needs each platform's official partner
// API, a separate approval process). Used by both
// netlify/functions/sync-ical.mts (the real automatic run, every 2
// hours) and app/api/sync-ical/route.ts (manual trigger/testing,
// since Netlify blocks direct external invocation of scheduled
// functions).
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

export async function runIcalSync() {
  const supabase = getServiceClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, airbnb_ical_url, vrbo_ical_url, booking_ical_url')

  if (!properties?.length) return { synced: [] as any[] }

  const results: any[] = []

  for (const property of properties) {
    const urls = [
      { url: property.airbnb_ical_url, source: 'airbnb' },
      { url: property.vrbo_ical_url, source: 'vrbo' },
      { url: property.booking_ical_url, source: 'booking' },
    ].filter(u => u.url)

    if (!urls.length) continue

    for (const { url, source } of urls) {
      try {
        const res = await fetch(url as string)
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

  return { synced: results }
}
