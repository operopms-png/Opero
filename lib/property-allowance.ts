'use client'
// How many properties the signed-in company has used and how many its plan allows.
// Paying clients get 3 included; every extra property is £12 a month (see /api/add-property-block).
// Internal accounts with no Stripe billing are unlimited. The database enforces the limit too (PROPERTY_LIMIT).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Allowance = { unlimited: boolean; limit: number; used: number; extra: number; lifetime: boolean }
export const INCLUDED_PROPERTIES = 3
export const EXTRA_PROPERTY_PRICE = 12
export const isPropertyLimitError = (e: any) => /PROPERTY_LIMIT/.test(String(e?.message ?? e ?? ''))

export function usePropertyAllowance() {
  const [allowance, setAllowance] = useState<Allowance>({ unlimited: true, limit: Infinity, used: 0, extra: 0, lifetime: false })
  const refreshAllowance = useCallback(async () => {
    const { data } = await supabase.rpc('property_allowance')
    if (data) setAllowance({ unlimited: !!data.unlimited, limit: data.unlimited ? Infinity : Number(data.limit), used: Number(data.used ?? 0), extra: Number(data.extra ?? 0), lifetime: !!data.lifetime })
  }, [])
  useEffect(() => { refreshAllowance() }, [refreshAllowance])
  return { allowance, refreshAllowance }
}
