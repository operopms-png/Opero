import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseIcal(text: string) {
  const events: any[] = []
  const lines = text.replace(/\r\n /g, '').split(/\r\n|\n/)
  let current: any = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
    } else if (line === 'END:VEVENT' && current) {
      events.push(current)
      current = null
    } else if (current) {
      if (line.startsWith('DTSTART')) {
        const val = line.split(':')[1]
        current.check_in = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':')[1]
        current.check_out = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`
      } else if (line.startsWith('SUMMARY')) {
        current.guest_name = line.split(':').slice(1).join(':').trim()
      } else if (line.startsWith('UID')) {
        current.uid = line.split(':').slice(1).join(':').trim()
      } else if (line.startsWith('DESCRIPTION')) {
        current.description = line.split(':').slice(1).join(':').trim()
      }
    }
  }
  return events
}

export async function POST(request: NextRequest) {
  try {
    const { ical_url, property_id, platform } = await request.json()

    if (!ical_url || !property_id) {
      return NextResponse.json({ error: 'ical_url and property_id are required' }, { status: 400 })
    }

    // Fetch iCal
    const response = await fetch(ical_url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch iCal URL' }, { status: 400 })
    }
    const text = await response.text()
    const events = parseIcal(text)

    let imported = 0
    let skipped = 0

    for (const event of events) {
      if (!event.check_in || !event.check_out) continue
      if (event.guest_name?.toLowerCase().includes('blocked') ||
          event.guest_name?.toLowerCase().includes('not available')) {
        skipped++
        continue
      }

      // Check if already exists by uid
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('property_id', property_id)
        .eq('ical_uid', event.uid)
        .single()

      if (existing) {
        skipped++
        continue
      }

      await supabase.from('bookings').insert([{
        property_id,
        guest_name: event.guest_name ?? 'Guest',
        check_in: event.check_in,
        check_out: event.check_out,
        status: 'confirmed',
        platform: platform ?? 'iCal',
        ical_uid: event.uid,
      }])
      imported++
    }

    return NextResponse.json({ success: true, imported, skipped, total: events.length })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 })
  }
}
