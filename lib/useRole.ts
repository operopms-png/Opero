'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Airbnb Agent' | 'Property Manager' | 'Dev' | 'Cleaner' | 'Maintenance' | 'Viewer' | 'Estate Agent'

export const ROLE_MODULES: Record<string, string[]> = {
  'Admin':            ['str', 'pm', 'dev', 'ea', 'invest', 'aipm'],
  'Airbnb Agent':     ['str'],
  'Property Manager': ['str', 'pm', 'ea'],
  'Dev':              ['str', 'pm', 'dev', 'ea'],
  'Cleaner':          ['str', 'pm', 'ea'],
  'Maintenance':      ['str', 'pm', 'ea'],
  'Viewer':           ['str', 'pm', 'dev', 'ea'],
  'Estate Agent':     ['ea'],
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

// For roles listed here, within a given module they can ONLY use the
// named tab — every other tab in that module shows locked/greyed out.
// Roles not listed here (Admin, Dev, Viewer, Property Manager, Estate
// Agent, Airbnb Agent) have no tab-level restriction — module-level
// access via ROLE_MODULES still applies on top of this.
export const RESTRICTED_TABS: Record<string, Record<string, string>> = {
  'Maintenance': { str: 'Maintenance', pm: 'Maintenance', estate: 'Maintenance' },
  'Cleaner':     { str: 'Cleaning', pm: 'Cleaning', estate: 'Cleaning' },
}

// Returns the single tab name this role is restricted to within a module,
// or null if this role has no tab-level restriction there.
export function getAllowedTab(role: string, moduleKey: string): string | null {
  return RESTRICTED_TABS[role]?.[moduleKey] ?? null
}

const KNOWN_ROLES: UserRole[] = ['Admin', 'Airbnb Agent', 'Property Manager', 'Dev', 'Cleaner', 'Maintenance', 'Viewer', 'Estate Agent']

// Matches a raw role string (whatever casing it was stored in) against
// the canonical role names, case-insensitively. Falls back to 'Admin'
// only if there's genuinely no match — a typo'd/lowercased role should
// never silently grant full access.
export function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return 'Admin'
  const match = KNOWN_ROLES.find(r => r.toLowerCase() === raw.trim().toLowerCase())
  return match ?? 'Admin'
}

export function useRole() {
  const [role, setRole] = useState<UserRole>('Admin')
  const [propertyIds, setPropertyIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      // .single() throws if there's more than one team_members row for this
      // email (which silently fell back to Admin below) — use a list query
      // instead and take the most recent row so duplicates can't grant
      // accidental full access.
      const { data } = await supabase
        .from('team_members')
        .select('role, property_ids')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
      // Not in team_members = owner = Admin. Otherwise normalize
      // whatever casing was stored against the canonical role names.
      setRole(normalizeRole(data?.[0]?.role))
      setPropertyIds(data?.[0]?.property_ids ?? [])
      setLoading(false)
    })
  }, [])

  return { role, propertyIds, loading, modules: ROLE_MODULES[role] ?? [], hasSettings: ROLE_SETTINGS[role] ?? false }
}
