import type { Metadata } from 'next'
import ListingsBrowser from '@/components/listings/ListingsBrowser'
import { getListings } from '@/lib/listings'

// Public lettings link: app.sangstersgroup.com/homes — every Estate Agency
// property switched on with "Show on listings link".
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const homes = await getListings()
  const cover = homes.find(h => h.photos.length)?.photos[0]?.url
  return {
    title: 'Homes to rent · Sangsters Group',
    description: `${homes.length} ${homes.length === 1 ? 'home' : 'homes'} to rent — see photos and book a viewing.`,
    openGraph: { title: 'Homes to rent · Sangsters Group', description: 'See photos and book a viewing.', images: cover ? [cover] : ['/logo-512.png'] },
  }
}

export default async function Page() {
  const homes = await getListings()
  return <ListingsBrowser homes={homes} />
}
