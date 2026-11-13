// Page pictures for the marketing documents, so they can go in an email as images as well as PDF links.
// The pictures are pre-made files in public/services/img (one per page). Documents staff upload themselves
// have no pictures, so they are sent as a link only.
import { SITE_URL } from '@/lib/brand'

const PAGES: Record<string, { prefix: string; pages: number }> = {
  'NOVOURQ_Brochure.pdf': { prefix: 'NOVOURQ_Brochure', pages: 12 },
  'Vacation_Rental_Landlord_Pack.pdf': { prefix: 'Vacation_Rental_Landlord_Pack', pages: 12 },
  'Furnished_Apartments_Flyer.pdf': { prefix: 'Furnished_Apartments_Flyer', pages: 1 },
  'Lease_Your_Property_Flyer.pdf': { prefix: 'Lease_Your_Property_Flyer', pages: 1 },
}

export const absUrl = (u: string) => /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`

// Picture URLs for a document's pages, or [] when it has none.
export function pagePictures(docUrl: string): string[] {
  const file = decodeURIComponent(String(docUrl).split('?')[0].split('/').pop() || '')
  const p = PAGES[file]
  if (!p) return []
  return Array.from({ length: p.pages }, (_, i) => `${SITE_URL}/services/img/${p.prefix}-${p.pages > 1 ? String(i + 1).padStart(2, '0') : '1'}.jpg`)
}
