// Public lettings listings (app.sangstersgroup.com/homes): Estate Agency
// properties switched on with "Show on listings link", minus rented/archived
// ones. Only listing-safe fields ever leave the server.
import { serviceClient } from '@/lib/admin-auth'
import { CURRENCIES, type Listing } from '@/lib/listings-shared'
export * from '@/lib/listings-shared'

export const LISTINGS_BUSINESS_ID = process.env.LISTINGS_BUSINESS_ID || 'bd780fdd-15e3-4306-8c87-788b23647ee5'
const HIDDEN = ['rented', 'archived', 'let agreed']

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
    rent: row.rent != null && row.rent !== '' && Number(row.rent) > 0 ? Number(row.rent) : null, currency: cur,
    status: String(row.status || '').toLowerCase() === 'maintenance' ? 'soon' : available ? 'soon' : 'now', available_from: available,
    description: row.description || '', features: Array.isArray(row.features) ? row.features.filter(Boolean) : [], photos: photosOf(row),
  }
}

const COLS = 'id,name,address,type,bedrooms,bathrooms,rent,currency,status,image_urls,photo_captions,description,features,available_from,listing_slug,listed,user_id'

export async function getListings(): Promise<Listing[]> {
  const { data } = await serviceClient.from('estate_properties').select(COLS).eq('user_id', LISTINGS_BUSINESS_ID).eq('listed', true).order('created_at', { ascending: false })
  return (data ?? []).filter(r => !HIDDEN.includes(String(r.status || '').toLowerCase())).map(toListing)
}

export async function getListing(idOrSlug: string): Promise<Listing | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug)
  const { data } = await serviceClient.from('estate_properties').select(COLS).eq('user_id', LISTINGS_BUSINESS_ID).eq('listed', true).eq(isUuid ? 'id' : 'listing_slug', idOrSlug).maybeSingle()
  if (!data || HIDDEN.includes(String(data.status || '').toLowerCase())) return null
  return toListing(data)
}
