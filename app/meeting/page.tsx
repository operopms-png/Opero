import type { Metadata } from 'next'
import BookingForm from '@/components/meetings/BookingForm'

// Public link clients use to request a meeting: app.thenovourq.com/meeting
export const metadata: Metadata = { title: 'Book a meeting · The NOVOURQ', description: 'Request a meeting with the NOVOURQ team.' }

export default function Page() {
  return <BookingForm />
}
