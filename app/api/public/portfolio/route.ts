import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/admin-auth'
import { LISTINGS_BUSINESS_ID } from '@/lib/listings'

// Public feed of the real portfolio for sangstersgroup.com (property search
// page, home page carousel). Estate Agency properties with "Show on website"
// switched on. Only website-safe fields leave the server — no owners, no
// rent for let properties, no addresses beyond the area.
//   GET /api/public/portfolio  -> { properties: [...] }

export const revalidate = 0
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const APP = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sangstersgroup.com'
const SYMBOL: Record<string, string> = { JMD: 'J$', USD: 'US$', GBP: '£', EUR: '€', CAD: 'C$', AED: 'AED ' }

function photos(row: any): string[] {
  try { const p = JSON.parse(row.image_urls || '[]'); if (Array.isArray(p)) return p.filter(Boolean) } catch { /* single url */ }
  return String(row.image_urls || '').startsWith('http') ? [row.image_urls] : []
}
const tidy = (s: string) => s && (s === s.toUpperCase() || s === s.toLowerCase()) ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : s

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function GET() {
  const { data, error } = await serviceClient.from('estate_properties')
    .select('id,name,web_title,web_area,country,lat,lng,guests,bedrooms,bathrooms,type,status,image_urls,airbnb_url,web_badge,web_sort,listed,listing_slug,rent,currency,description')
    .eq('user_id', LISTINGS_BUSINESS_ID).eq('show_on_website', true)
    .order('web_sort').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unavailable' }, { status: 500, headers: CORS })

  const properties = (data ?? []).map(r => {
    const st = String(r.status || '').toLowerCase()
    const isLet = ['rented', 'let agreed', 'occupied'].includes(st)
    const kind = isLet ? 'let' : /development/i.test(String(r.type || '') + ' ' + String(r.web_badge || '')) ? 'development' : r.airbnb_url ? 'stay' : 'rent'
    const pics = photos(r)
    const beds = r.bedrooms ? (/studio/i.test(r.bedrooms) ? 'Studio' : `${r.bedrooms} Bed`) : null
    const homesUrl = r.listed && !isLet ? `${APP}/homes/${r.listing_slug || r.id}` : null
    return {
      id: r.id,
      title: r.web_title || tidy(String(r.name || '').trim()),
      area: r.web_area || null,
      country: r.country || null,
      location: [r.web_area, r.country].filter(Boolean).join(', ').toUpperCase() || null,
      badge: r.web_badge || null,
      kind,                                   // stay | rent | let | development
      status: isLet ? 'let' : 'available',
      lat: r.lat, lng: r.lng,
      guests: r.guests || null,
      beds, baths: r.bathrooms ? `${r.bathrooms} Bath` : null,
      cover: pics[0] || null,
      photos: pics.slice(0, 12),
      book_url: !isLet && r.airbnb_url ? r.airbnb_url : null,
      rent_url: homesUrl,
      // rent set in the portal (Estate Agency / Staff Centre → Listings) shows on the website for every available property
      rent: !isLet && Number(r.rent) > 0 ? `${SYMBOL[r.currency] ?? ''}${Number(r.rent).toLocaleString('en-GB')}/month` : null,
      photo_count: pics.length,
      url: (!isLet && (r.airbnb_url || homesUrl)) || null,
      enquire_url: `${APP}/meeting`,
    }
  })
  return NextResponse.json({ properties, updated: new Date().toISOString() }, { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } })
}
