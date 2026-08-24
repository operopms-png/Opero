'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Vacation Rental Team' | 'Property Management Team' | 'Development Team' | 'Cleaning Team' | 'Maintenance Team' | 'Viewer' | 'Estate Agency Team'

// Each role's allowed module keys. This list drives BOTH the tab-level
// UI (locking things they can see but shouldn't use) and the hard
// page-access guard in app/layout.tsx (blocking direct navigation to a
// module entirely) — a role picked here is the ONLY thing that module
// scoping in the whole app is keyed off of.
export const ROLE_MODULES: Record<string, string[]> = {
  'Admin':                       ['str', 'pm', 'dev', 'ea', 'invest', 'aipm'],
  'Vacation Rental Team':        ['str'],
  'Property Management Team':    ['pm'],
  'Development Team':            ['dev'],
  'Estate Agency Team':          ['ea'],
  'Cleaning Team':                ['str', 'pm', 'ea'],
  'Maintenance Team':            ['str', 'pm', 'ea'],
  'Viewer':                      ['str', 'pm', 'dev', 'ea', 'invest', 'aipm'],
}

export const ROLE_SETTINGS: Record<string, boolean> = {
  'Admin':                       true,
  'Vacation Rental Team':        false,
  'Property Management Team':    false,
  'Development Team':            false,
  'Estate Agency Team':          false,
  'Cleaning Team':                false,
  'Maintenance Team':            false,
  'Viewer':                      false,
}

// Viewer can see everything ROLE_MODULES grants it, but can't create,
// edit, or delete anything anywhere. Enforced for real (not just UI) in
// lib/supabase.ts, which blocks every write at the network-call level
// regardless of which page/button triggered it.
export const ROLE_READONLY: Record<string, boolean> = {
  'Viewer': true,
}

// For roles listed here, within a given module they can ONLY use the
// named tab — every other tab in that module shows locked/greyed out.
// Roles not listed here have no tab-level restriction — module-level
// access via ROLE_MODULES still applies on top of this.
export const RESTRICTED_TABS: Record<string, Record<string, string>> = {
  'Maintenance Team': { str: 'Maintenance', pm: 'Maintenance', estate: 'Maintenance' },
  'Cleaning Team':     { str: 'Cleaning', pm: 'Cleaning', estate: 'Cleaning' },
}

// Returns the single tab name this role is restricted to within a module,
// or null if this role has no tab-level restriction there.
export function getAllowedTab(role: string, moduleKey: string): string | null {
  return RESTRICTED_TABS[role]?.[moduleKey] ?? null
}

const KNOWN_ROLES: UserRole[] = ['Admin', 'Vacation Rental Team', 'Property Management Team', 'Development Team', 'Cleaning Team', 'Maintenance Team', 'Viewer', 'Estate Agency Team']

// Old role names, kept only so a not-yet-migrated team_members row
// (or a stale cached session) still resolves to the right new role
// instead of silently falling back to Admin. The DB itself is migrated
// to the new names directly — see
// migrations/rename-team-roles.sql — this is a safety net, not the
// primary mechanism.
const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  'airbnb agent':     'Vacation Rental Team',
  'property manager': 'Property Management Team',
  'dev':              'Development Team',
  'cleaner':          'Cleaning Team',
  'maintenance':      'Maintenance Team',
  'estate agent':     'Estate Agency Team',
}

// Matches a raw role string (whatever casing it was stored in) against
// the canonical role names, case-insensitively. Falls back to 'Admin'
// only if there's genuinely no match — a typo'd/lowercased role should
// never silently grant full access.
export function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return 'Admin'
  const trimmed = raw.trim().toLowerCase()
  const match = KNOWN_ROLES.find(r => r.toLowerCase() === trimmed)
  if (match) return match
  return LEGACY_ROLE_ALIASES[trimmed] ?? 'Admin'
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

  return { role, propertyIds, loading, modules: ROLE_MODULES[role] ?? [], hasSettings: ROLE_SETTINGS[role] ?? false, readOnly: ROLE_READONLY[role] ?? false }
}

