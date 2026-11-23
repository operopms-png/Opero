'use client'
// Hotels and Gated Communities are for every company that has Real Estate Intelligence, each on its own data.
// 'view' for read-only roles (the database also blocks their writes), 'none' for people with no Real Estate Intelligence access.
import { useRole } from '@/lib/useRole'

export type RealEstateAccess = 'none' | 'view' | 'full'
const REI = ['str', 'pm', 'dev', 'ea']

export function useRealEstateAccess(): RealEstateAccess | null {
  const { loading, modules, readOnly } = useRole()
  if (loading) return null
  if (!modules.some(m => REI.includes(m))) return 'none'
  return readOnly ? 'view' : 'full'
}
