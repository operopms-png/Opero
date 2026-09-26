'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Vacation Rental Team' | 'Property Management Team' | 'Development Team' | 'Cleaning Team' | 'Maintenance Team' | 'Viewer' | 'Estate Agency Team' | 'Partner'

export const ROLE_MODULES: Record<string, string[]> = {
  'Admin':                       ['str', 'pm', 'dev', 'ea', 'invest', 'aipm', 'sc'],
  'Vacation Rental Team':        ['str'],
  'Property Management Team':    ['pm'],
  'Development Team':            ['dev'],
  'Estate Agency Team':          ['ea'],
  'Cleaning Team':                ['str', 'pm', 'ea'],
  'Maintenance Team':            ['str', 'pm', 'ea'],
  'Viewer':                      ['str', 'pm', 'dev', 'ea', 'invest', 'aipm', 'sc'],
  // Investors / partners: Staff Centre → Partners only, unless an admin grants more
  'Partner':                     ['sc'],
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
  'Partner':                     false,
}

export const ROLE_READONLY: Record<string, boolean> = {
  'Viewer': true,
}

export const RESTRICTED_TABS: Record<string, Record<string, string>> = {
  'Maintenance Team': { str: 'Maintenance', pm: 'Maintenance', estate: 'Maintenance' },
  'Cleaning Team':     { str: 'Cleaning', pm: 'Cleaning', estate: 'Cleaning' },
}

export function getAllowedTab(role: string, moduleKey: string): string | null {
  return RESTRICTED_TABS[role]?.[moduleKey] ?? null
}

export const STAFF_CENTRE_TABS: { k: string; l: string }[] = [
  { k: 'oversight',  l: 'Dashboard' },
  { k: 'partners',   l: 'Partners' },
  { k: 'investors',  l: 'Investors' },
  { k: 'customeronboarding', l: 'Customer Onboarding' },
  { k: 'meetings',    l: 'Meetings' },
  { k: 'inbox',       l: 'Conversations' },
  { k: 'portalaccess', l: 'Portal Access' },
  { k: 'portals',     l: 'Property Portals' },
  { k: 'maintenance', l: 'Maintenance Board' },
  { k: 'crm',         l: 'CRM' },
  { k: 'marketing',   l: 'Marketing' },
  { k: 'sales',       l: 'Sales' },
  { k: 'applications', l: 'Applications' },
  { k: 'performance', l: 'Staff Performance' },
  { k: 'hr',          l: 'People & HR' },
  { k: 'training',    l: 'Staff Training' },
  { k: 'calendar',    l: 'Calendar' },
  { k: 'tasks',       l: 'Tasks' },
]
export const SC_TABS = STAFF_CENTRE_TABS.map(t => t.k)
export const DEFAULT_SC_TABS = [...SC_TABS]

export function getScTabs(role: string, modules: string[]): string[] {
  if (!modules.includes('sc')) return []
  if (role === 'Admin') return [...SC_TABS]
  const explicit = modules.filter(m => m.startsWith('sc:')).map(m => m.slice(3))
  // Partners always get the Partners tab, plus only what an admin has ticked
  if (role === 'Partner') return ['partners', ...explicit.filter(t => t !== 'partners')]
  return explicit.length ? explicit : DEFAULT_SC_TABS
}

// Modules and Staff Centre tabs an admin can grant a partner on top of Partners
export const PARTNER_GRANTABLE_MODULES: { k: string; l: string }[] = [
  { k: 'str', l: 'Vacation Rentals' },
  { k: 'pm', l: 'Property Management' },
  { k: 'ea', l: 'Estate Agency' },
  { k: 'dev', l: 'Developments' },
]

export type Access = {
  role: UserRole
  customModules: string[] | null
  propertyIds: string[]
  businessId: string
  isPartner: boolean
}

// Single source of truth for who someone is when they sign in.
//  1. A team_members row (staff, or a partner an admin has granted extra access to)
//  2. Otherwise an owner_profiles row → investor partner (Partners tab only)
//  3. Otherwise the business owner's own login → Admin
export async function resolveAccess(user: { id: string; email?: string | null }): Promise<Access> {
  const [{ data: rows }, { data: owner }] = await Promise.all([
    supabase.from('team_members').select('role, user_id, property_ids, custom_modules').eq('email', user.email ?? '').order('created_at', { ascending: false }).limit(1),
    supabase.from('owner_profiles').select('id, business_id, custom_modules').eq('user_id', user.id).maybeSingle(),
  ])
  const row = rows?.[0]
  if (row) {
    const role = owner ? 'Partner' : normalizeRole(row.role)
    return {
      role,
      customModules: row.custom_modules?.length ? row.custom_modules : null,
      propertyIds: row.property_ids ?? [],
      businessId: row.user_id ?? user.id,
      isPartner: role === 'Partner',
    }
  }
  if (owner) {
    return {
      role: 'Partner',
      customModules: owner.custom_modules?.length ? owner.custom_modules : null,
      propertyIds: [],
      businessId: owner.business_id ?? user.id,
      isPartner: true,
    }
  }
  return { role: 'Admin', customModules: null, propertyIds: [], businessId: user.id, isPartner: false }
}

const KNOWN_ROLES: UserRole[] = ['Admin', 'Vacation Rental Team', 'Property Management Team', 'Development Team', 'Cleaning Team', 'Maintenance Team', 'Viewer', 'Estate Agency Team', 'Partner']

const LEGACY_ROLE_ALIASES: Record<string, UserRole> = {
  'airbnb agent':     'Vacation Rental Team',
  'property manager': 'Property Management Team',
  'dev':              'Development Team',
  'cleaner':          'Cleaning Team',
  'maintenance':      'Maintenance Team',
  'estate agent':     'Estate Agency Team',
}

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
  const [customModules, setCustomModules] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const access = await resolveAccess(user)
      setRole(access.role)
      setPropertyIds(access.propertyIds)
      setCustomModules(access.customModules)
      setLoading(false)
    })
  }, [])

  return { role, propertyIds, loading, modules: customModules ?? (ROLE_MODULES[role] ?? []), hasSettings: ROLE_SETTINGS[role] ?? false, readOnly: ROLE_READONLY[role] ?? false }
}
