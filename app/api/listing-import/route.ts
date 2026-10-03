import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/admin-auth'

// Pulls full details and photos for a property from a listing link, so the
// Deal Analyser can show the property and fill in the form.
//
// POST { url } -> { listings: Listing[] }
//
// Supported: Realtors Association of Jamaica MLS links shared from Xposure
// (jamaica.xposureapp.com/portal/jamaica/InteractiveLink?...). The gateway page
// already carries every field we need (price, beds, baths, sizes, remarks,
// lat/lng and the photo id + count), so a plain GET is enough. One link can
// hold several listings; each is returned.
// Any other link falls back to the page's Open Graph title / description / image.

export type ImportedListing = {
  source: string
  sourceUrl: string
  mls: string | null
  address: string
  area: string | null
  subarea: string | null
  price: number | null
  priceText: string | null
  currency: 'JMD' | 'USD' | 'GBP' | null
  status: string | null
  saleOrRent: string | null
  rentalPrice: string | null
  style: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSqft: number | null
  lotAcres: number | null
  yearBuilt: string | null
  daysOnMarket: number | null
  amenities: string | null
  siteInfluence: string | null
  exterior: string | null
  subdivision: string | null
  description: string | null
  lat: number | null
  lng: number | null
  photos: string[]
  agent?: string | null
}

const decode = (s: string) => s
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/[ \t]+/g, ' ').trim()
const num = (s: string | null | undefined) => { if (!s) return null; const v = parseFloat(s.replace(/[^0-9.]/g, '')); return Number.isFinite(v) ? v : null }
const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase())
const pick = (html: string, re: RegExp) => { const m = html.match(re); return m ? decode(m[1]) : null }

function parseXposure(html: string, sourceUrl: string): ImportedListing[] {
  const board = pick(html, /setPhotoServerUrl\("[^"]*board=([a-z]+)/i) || 'jamaica'
  const agent = pick(html, /alt="([^"]+?) Agent Photo"/)
  const rows = html.split(/<div class="listing-container[^"]*" id="row\d+"/).slice(1)
  return rows.map(row => {
    const field = (label: string) => {
      const m = row.match(new RegExp(`<td class='listing-label'>${label.replace(/[.#]/g, '\\$&')}</td>\\s*<td>([\\s\\S]*?)</td>`, 'i'))
      const v = m ? decode(m[1]) : ''
      return v || null
    }
    const priceText = pick(row, /class="listing-price"[^>]*>([^<]+)</)
    const uid = pick(row, /data-uid="([^"]+)"/)
    const count = Math.min(60, parseInt(pick(row, /data-photocount="(\d+)"/) || '0') || 0)
    const photos = uid ? Array.from({ length: Math.max(count, 1) }, (_, i) =>
      `https://images.realtyserver.com/photo_server.php?btnSubmit=GetPhoto&board=${board}&name=${uid}.L${String(i + 1).padStart(2, '0')}&failover=portal_Blank.gif`) : []
    const cur = /JMD|J\$/i.test(priceText || '') ? 'JMD' : /US|\$/.test(priceText || '') ? 'USD' : null
    const area = pick(row, /class="listing-area">([^<]*)</)
    const subarea = pick(row, /class="listing-subarea">([^<]*)</)
    // MLS addresses end with the town and a 2-letter parish code ("… CHRISTIANA MA");
    // drop those because town and parish are shown separately.
    let address = (pick(row, /class="listing-address">([^<]*)</) || '').replace(/\s+[A-Z]{2}$/, '')
    if (subarea && address.toLowerCase().endsWith(' ' + subarea.toLowerCase())) address = address.slice(0, -subarea.length).trim()
    const longDesc = pick(row, /class="long-description[^"]*">([\s\S]*?)<\/p>/)
    return {
      source: 'Realtors Association of Jamaica MLS',
      sourceUrl,
      mls: field('MLS#'),
      address: title(address),
      area,
      subarea,
      price: num(priceText),
      priceText,
      currency: cur as ImportedListing['currency'],
      status: field('Status'),
      saleOrRent: field('Sale or Rent'),
      rentalPrice: field('Rental Price'),
      style: field('Style'),
      bedrooms: num(field('Bedrooms')),
      bathrooms: num(field('Bathrooms')),
      sqft: num(field('Sqft Total')),
      lotSqft: num(field('Lot Sqft')),
      lotAcres: num(field('Lot Acres')),
      yearBuilt: field('Year Built'),
      daysOnMarket: num(field('DOM')),
      amenities: field('Amenities'),
      siteInfluence: field('Site Infl.'),
      exterior: field('Exterior'),
      subdivision: field('Subdivision'),
      description: longDesc || pick(row, /class="brief-description">([\s\S]*?)<\/p>/),
      lat: pick(row, /data-latitude="([-0-9.]+)"/) ? parseFloat(pick(row, /data-latitude="([-0-9.]+)"/)!) : null,
      lng: pick(row, /data-longitude="([-0-9.]+)"/) ? parseFloat(pick(row, /data-longitude="([-0-9.]+)"/)!) : null,
      photos,
      agent,
    }
  })
}

function parseOpenGraph(html: string, sourceUrl: string): ImportedListing[] {
  const og = (p: string) => pick(html, new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']*)["']`, 'i'))
  const t = og('title') || pick(html, /<title>([^<]*)<\/title>/i)
  if (!t) return []
  const img = og('image')
  return [{
    source: new URL(sourceUrl).hostname.replace(/^www\./, ''), sourceUrl, mls: null, address: t, area: null, subarea: null,
    price: null, priceText: null, currency: null, status: null, saleOrRent: null, rentalPrice: null, style: null,
    bedrooms: null, bathrooms: null, sqft: null, lotSqft: null, lotAcres: null, yearBuilt: null, daysOnMarket: null,
    amenities: null, siteInfluence: null, exterior: null, subdivision: null, description: og('description'),
    lat: null, lng: null, photos: img ? [img] : [],
  }]
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { url } = await req.json().catch(() => ({}))
  let u: URL
  try { u = new URL(String(url || '').trim()) } catch { return NextResponse.json({ error: 'Paste a full listing link starting with https://' }, { status: 400 }) }
  if (!/^https?:$/.test(u.protocol)) return NextResponse.json({ error: 'That is not a web link.' }, { status: 400 })
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return NextResponse.json({ error: 'That link is not allowed.' }, { status: 400 })

  let html = ''
  try {
    const res = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36', Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
    if (!res.ok) return NextResponse.json({ error: `The listing site returned an error (${res.status}). The link may have expired — ask for a fresh one.` }, { status: 502 })
    html = (await res.text()).slice(0, 2_000_000)
  } catch {
    return NextResponse.json({ error: 'Could not reach the listing site. Try again in a minute.' }, { status: 502 })
  }

  const listings = /xposureapp\.com$/i.test(u.hostname) && html.includes('listing-container')
    ? parseXposure(html, u.toString())
    : parseOpenGraph(html, u.toString())

  if (!listings.length) {
    const login = /Login/i.test(pick(html, /<title>([^<]*)<\/title>/i) || '')
    return NextResponse.json({ error: login ? 'That link needs a login, so the details can’t be read. Ask the agent for a shareable listing link.' : 'No property details found on that page.' }, { status: 422 })
  }
  return NextResponse.json({ listings })
}
