// Public lettings listings (app.thenovourq.com/homes): Estate Agency
// properties switched on with "Show on listings link", minus rented/archived
// ones. Only listing-safe fields ever leave the server.
import { serviceClient } from '@/lib/admin-auth'
import { CURRENCIES, parseVideos, type Listing } from '@/lib/listings-shared'
import { sanitizeLayout } from '@/lib/flat-layout'
export * from '@/lib/listings-shared'

export const LISTINGS_BUSINESS_ID = process.env.LISTINGS_BUSINESS_ID || 'bd780fdd-15e3-4306-8c87-788b23647ee5'
const HIDDEN = ['rented', 'archived', 'let agreed', 'sold', 'sale agreed']

function photosOf(row: any): { url: string; caption: string }[] {
  let urls: string[] = []
  try { const p = JSON.parse(row.image_urls || '[]'); if (Array.isArray(p)) urls = p.filter(Boolean) } catch { if (String(row.image_urls || '').startsWith('http')) urls = [row.image_urls] }
  const caps = row.photo_captions || {}
  return urls.map(url => ({ url, caption: String(caps[url] || '') }))
}

export function toListing(row: any): Listing {
  const cur = CURRENCIES[row.currency] ? row.currency : 'JMD'
  const available = row.available_from && new Date(row.available_from + 'T00:00:00') > new Date() ? row.available_from : null
  return {
    id: row.id, slug: row.listing_slug || row.id, name: String(row.name || '').trim(), address: String(row.address || '').trim(),
    type: row.type || 'Property', bedrooms: row.bedrooms ? String(row.bedrooms) : '', bathrooms: row.bathrooms ? String(row.bathrooms) : '',
    rent: row.rent != null && row.rent !== '' && Number(row.rent) > 0 ? Number(row.rent) : null, for_sale: !!row.for_sale, sale_price: row.sale_price != null && Number(row.sale_price) > 0 ? Number(row.sale_price) : null, currency: cur,
    status: String(row.status || '').toLowerCase() === 'maintenance' ? 'soon' : available ? 'soon' : 'now', available_from: available,
    description: row.description || '', features: Array.isArray(row.features) ? row.features.filter(Boolean) : [], photos: photosOf(row), videos: parseVideos(row.video_urls),
  }
}

const COLS = 'id,name,address,type,bedrooms,bathrooms,rent,for_sale,sale_price,currency,status,image_urls,photo_captions,description,features,available_from,listing_slug,listed,user_id,video_urls,show_3d'

export async function getListings(): Promise<Listing[]> {
  const { data } = await serviceClient.from('estate_properties').select(COLS).eq('user_id', LISTINGS_BUSINESS_ID).is('ended_at', null).eq('listed', true).order('created_at', { ascending: false })
  return (data ?? []).filter(r => !HIDDEN.includes(String(r.status || '').toLowerCase())).map(toListing)
}

const COLS_DETAIL = COLS + ',layout' // the room layout is only needed on the property page, not the list

export async function getListing(idOrSlug: string): Promise<Listing | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug)
  const { data: raw } = await serviceClient.from('estate_properties').select(COLS_DETAIL).eq('user_id', LISTINGS_BUSINESS_ID).eq('listed', true).is('ended_at', null).eq(isUuid ? 'id' : 'listing_slug', idOrSlug).maybeSingle()
  const data: any = raw
  if (!data || HIDDEN.includes(String(data.status || '').toLowerCase())) return null
  const home = toListing(data)
  if (data.show_3d !== false) {
    // Flats of this property with saved rooms, for the read-only 3D walk-through on the public page.
    const { data: us } = await serviceClient.from('estate_units').select('id,unit_number,layout').eq('property_id', data.id).eq('user_id', LISTINGS_BUSINESS_ID).not('layout', 'is', null).order('unit_number').limit(12)
    const own = sanitizeLayout(data.layout) // the property's own layout (a house, or anything with no flats)
    const flats = [...(own ? [{ id: String(data.id), unit: '', layout: own }] : []), ...(us ?? []).flatMap(u => { const layout = sanitizeLayout(u.layout); return layout ? [{ id: String(u.id), unit: String(u.unit_number || ''), layout }] : [] })]
    if (flats.length) home.flats = flats
  }
  return home
}
