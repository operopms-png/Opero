'use client'
// Fleet and Rides is for NOVOURQ's own company only. The database decides who may see it (fleet_access() in Supabase):
// the platform owner and Admin / Co Founder staff get full access, other staff get view only unless the admin sets them to
// full or none (Settings → Team Management), and client companies get none.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type FleetAccess = 'none' | 'view' | 'full'

export function useFleetAccess() {
  const [access, setAccess] = useState<FleetAccess | null>(null)
  useEffect(() => {
    let alive = true
    supabase.rpc('fleet_access').then(({ data, error }) => {
      if (!alive) return
      setAccess(!error && (data === 'view' || data === 'full') ? data : 'none')
    })
    return () => { alive = false }
  }, [])
  return access
}
