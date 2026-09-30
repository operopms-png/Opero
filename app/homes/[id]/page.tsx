import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ListingDetail from '@/components/listings/ListingDetail'
import { getListing, money, titleCase, bedLabel } from '@/lib/listings'

// One property on the public lettings link: /homes/<id>. Shareable on its own
// (WhatsApp/social previews use the first photo).
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const h = await getListing(id)
  if (!h) return { title: 'Home to rent · Sangsters Group' }
  const title = `${titleCase(h.name)}${h.rent ? ` — ${money(h.rent, h.currency)} / month` : ''}`
  const description = [bedLabel(h.bedrooms), h.type, h.address].filter(Boolean).join(' · ')
  return { title: `${title} · Sangsters Group`, description, openGraph: { title, description, images: h.photos[0] ? [h.photos[0].url] : ['/logo-512.png'] } }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const home = await getListing(id)
  if (!home) notFound()
  return <ListingDetail home={home} />
}
