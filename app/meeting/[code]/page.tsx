import type { Metadata } from 'next'
import BookingForm from '@/components/meetings/BookingForm'

// Same booking form for a specific booking page code: /meeting/<code>
export const metadata: Metadata = { title: 'Book a meeting · Sangsters Group', description: 'Request a meeting with the Sangsters team.' }

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <BookingForm code={code} />
}
