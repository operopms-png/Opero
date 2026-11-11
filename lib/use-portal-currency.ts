'use client'
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'
import { cur, setCur } from '@/lib/company-currency'

// For landlord and tenant portals: use the currency symbol of the company they belong to. Call once at the top of the page.
export function usePortalCurrency() {
  const [, tick] = useState(0)
  useEffect(() => {
    staffApi<{ symbol: string | null }>('/api/portal-currency').then(d => { if (d.symbol && d.symbol !== cur()) { setCur(d.symbol); tick(n => n + 1) } }).catch(() => {})
  }, [])
}
