'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NAV = [
  { href: '/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/properties', icon: '🏠', label: 'Properties' },
  { href: '/bookings', icon: '📅', label: 'Bookings' },
  { href: '/cleaning', icon: '🧹', label: 'Cleaning' },
  { href: '/turnovers', icon: '🔄', label: 'Turnovers' },
  { href: '/maintenance', icon: '🔧', label: 'Maintenance' },
  { href: '/analytics', icon: '📈', label: 'Analytics' },
  { href: '/reports', icon: '📊', label: 'Reports' },
  { href: '/integrations', icon: '🔗', label: 'Integrations' },
]

export default function Sidebar() {
  const pathname = usePathname()

  async function handleSignOut() {
    await supabase.auth.signOut()