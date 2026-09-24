'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type UserRole = 'Admin' | 'Vacation Rental Team' | 'Property Management Team' | 'Development Team' | 'Cleaning Team' | 'Maintenance Team' | 'Viewer' | 'Estate Agency Team'

export const ROLE_MODULES: Record<string, string[]> = {
  'Admin':                       ['str', 'pm', 'dev', 'ea', 'invest', 'aipm', 'sc'],
  'Vacation Rental Team':        ['str'],
  'Property Management Team':    ['pm'],
  'Development Team':            ['dev'],
  'Estate Agency Team':          ['ea'],
  'Cleaning Team':                ['str', 'pm', 'ea'],
  'Maintenance Team':            ['str', 'pm', 'ea'],
  'Viewer':                      ['str', 'pm', 'dev', 'ea', 'invest', 'aipm', 'sc'],
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
  return explicit.length ? explicit : DEFAULT_SC_TABS
}

const KNOWN_ROLES: UserRole[] = ['Admin', 'Vacation Rental Team', 'Property Management Team', 'Development Team', 'Cleaning Team', 'Maintenance Team', 'Viewer', 'Estate Agency Team']

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
      const { data } = await supabase
        .from('team_members')
        .select('role, property_ids, custom_modules')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
      setRole(normalizeRole(data?.[0]?.role))
      setPropertyIds(data?.[0]?.property_ids ?? [])
      setCustomModules(data?.[0]?.custom_modules?.length ? data[0].custom_modules : null)
      setLoading(false)
    })
  }, [])

  return { role, propertyIds, loading, modules: customModules ?? (ROLE_MODULES[role] ?? []), hasSettings: ROLE_SETTINGS[role] ?? false, readOnly: ROLE_READONLY[role] ?? false }
}
