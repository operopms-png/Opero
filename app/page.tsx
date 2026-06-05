'use client'
export default function Home() {
  if (typeof window !== 'undefined') {
    window.location.href = '/landing.html'
  }
  return null
}