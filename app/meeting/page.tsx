import type { Metadata } from 'next'
import BookingForm from '@/components/meetings/BookingForm'

// Public link clients use to request a meeting: app.sangstersgroup.com/meeting
export const metadata: Metadata = { title: 'Book a meeting · Sangsters Group', description: 'Request a meeting with the Sangsters team.' }

export default function Page() {
  return <BookingForm />
}
