'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Airbnb Agent' | 'Property Manager' | 'Dev' | 'Cleaner' | 'Maintenance' | 'Viewer' | 'Estate Agent'

export const ROLE_MODULES: Record<string, string[]> = {
  'Admin':            ['str', 'pm', 'dev', 'estate'],
  'Airbnb Agent':     ['str'],
  'Property Manager': ['str', 'pm', 'estate'],
  'Dev':              ['str', 'pm', 'dev', 'estate'],
  'Cleaner':          ['str'],
  'Maintenance':      ['str', 'pm', 'dev', 'estate'],
  'Viewer':           ['str', 'pm', 'dev', 'estate'],
  'Estate Agent':     ['estate'],
}

export const ROLE_SETTINGS: Record<string, boolean> = {
  'Admin':            true,
  'Airbnb Agent':     false,
  'Property Manager': false,
  'Dev':              true,
  'Cleaner':          false,
  'Maintenance':      false,
  'Viewer':           false,
  'Estate Agent':     false,
}

export function useRole() {
  const [role, setRole] = useState<UserRole>('Admin')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('team_members')
        .select('role')
        .eq('email', user.email)
        .single()
      // Not in team_members = owner = Admin
      setRole((data?.role as UserRole) ?? 'Admin')
      setLoading(false)
    })
  }, [])

  return { role, loading, modules: ROLE_MODULES[role] ?? [], hasSettings: ROLE_SETTINGS[role] ?? false }
}
