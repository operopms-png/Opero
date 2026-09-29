'use client'
import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRole, ROLE_MODULES, getScTabs, resolveAccess } from '@/lib/useRole'
import NotificationBell from '@/components/NotificationBell'
import { useSidebarCollapse, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/sidebar-context'
import { BRAND_NAME } from '@/lib/brand'

const NAV_GROUPS = [
  {
    label: 'Vacation Rentals',
    module: 'str',
    modulePrice: '£29/mo',
    items: [
      { href: '/str', label: 'Vacation Rentals', key: 'str', icon: 'home', badge: 'str' },
    ]
  },
  {
    label: 'Property Management',
    module: 'pm',
    modulePrice: '£39/mo',
    items: [
      { href: '/pm', label: 'Property Management', key: 'pm', icon: 'building', badge: 'pm' },
    ]
  },
  {
    label: 'Estate Agency',
    module: 'ea',
    modulePrice: '£59/mo',
    items: [
      { href: '/estate', label: 'Estate Agency', key: 'estate', icon: 'building', badge: 'estate' },
    ]
  },
  {
    label: 'Developments',
    module: 'dev',
    modulePrice: '£49/mo',
    items: [
      { href: '/dev', label: 'Developments', key: 'dev', icon: 'folder', badge: 'dev' },
    ]
  },
  {
    label: 'Staff Centre',
    module: 'staffcentre',
    staffCentre: true,
    items: [
      { href: '/staff-centre/oversight', label: 'Dashboard', key: 'staffcentre', icon: 'trendingup', scTab: 'oversight' },
      { href: '/staff-centre/partners', label: 'Partners', key: 'staffcentre', icon: 'users', scTab: 'partners', badge: 'partners' },
      { href: '/ai-manager', label: 'AI Property Manager', key: 'ai', icon: 'sparkles', requiresModule: 'aipm', requiresModulePrice: '£9.99/mo' },
      { href: '/invest', label: 'Deal Analyser', key: 'invest', icon: 'calculator', requiresModule: 'invest', requiresModulePrice: '£19/mo' },
      { href: '/invest', label: 'Watchlist', key: 'invest', icon: 'bookmark', requiresModule: 'invest', requiresModulePrice: '£19/mo' },
      { href: '/staff-centre/investors', label: 'Investors', key: 'staffcentre', icon: 'revenue', scTab: 'investors' },
      { href: '/staff-centre/customer-onboarding', label: 'Customer Onboarding', key: 'staffcentre', icon: 'report', scTab: 'customeronboarding' },
      { href: '/staff-centre/meetings', label: 'Meetings', key: 'staffcentre', icon: 'phone', scTab: 'meetings', badge: 'meetings' },
      { href: '/staff-centre/inbox', label: 'Conversations', key: 'staffcentre', icon: 'message', scTab: 'inbox', badge: 'inbox' },
      { href: '/staff-centre/website-chats', label: 'Website Chats', key: 'staffcentre', icon: 'globe', scTab: 'inbox', badge: 'webchat' },
      { href: '/staff-centre/portal-access', label: 'Portal Access', key: 'staffcentre', icon: 'globe', scTab: 'portalaccess' },
      { href: '/staff-centre/portals', label: 'Property Portals', key: 'staffcentre', icon: 'globe', scTab: 'portals' },
      { href: '/staff-centre/maintenance', label: 'Maintenance Board', key: 'staffcentre', icon: 'wrench', scTab: 'maintenance', badge: 'maintenance' },
      { href: '/staff-centre/crm', label: 'CRM', key: 'staffcentre', icon: 'contacts', scTab: 'crm', badge: 'crm' },
      { href: '/staff-centre/marketing', label: 'Marketing', key: 'staffcentre', icon: 'sparkles', scTab: 'marketing' },
      { href: '/staff-centre/sales', label: 'Sales', key: 'staffcentre', icon: 'trendingup', scTab: 'sales', badge: 'sales' },
      { href: '/staff-centre/applications', label: 'Applications', key: 'staffcentre', icon: 'file', scTab: 'applications', badge: 'applications' },
      { href: '/settings?section=Team+Management', label: 'Team Management', key: 'staffcentre', icon: 'team' },
      { href: '/staff-centre/performance', label: 'Staff Performance', key: 'staffcentre', icon: 'trendingup', scTab: 'performance' },
      { href: '/staff-centre/hr', label: 'People & HR', key: 'staffcentre', icon: 'users', scTab: 'hr', badge: 'hr' },
      { href: '/staff-centre/training', label: 'Staff Training', key: 'staffcentre', icon: 'graduation', scTab: 'training' },
      { href: '/staff-centre/calendar', label: 'Calendar', key: 'staffcentre', icon: 'calendar', scTab: 'calendar' },
      { href: '/staff-centre/tasks', label: 'Tasks', key: 'staffcentre', icon: 'file', scTab: 'tasks', badge: 'tasks' },
    ]
  },
]

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ['dashboard','properties','cleaning','maintenance','turnovers','team','pm','dev','str','estate','invest','ai','ai','staffcentre'],
  growth:       ['dashboard','properties','cleaning','maintenance','turnovers','bookings','owners','analytics','integrations','team','reports','documents','guest-comms','audit','pm','dev','str','estate','invest','ai','ai','staffcentre'],
  professional: ['dashboard','properties','cleaning','maintenance','turnovers','bookings','owners','analytics','integrations','team','reports','documents','guest-comms','audit','pm','dev','str','estate','invest','ai','ai','staffcentre'],
  bundle:       ['dashboard','properties','cleaning','maintenance','turnovers','bookings','owners','analytics','integrations','team','reports','documents','guest-comms','audit','pm','dev','str','estate','invest','ai','ai','staffcentre'],
}

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 }
  const icons: Record<string, React.ReactElement> = {
    home:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    calendar: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    building: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    sparkles: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
    wrench:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    refresh:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    users:    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    chart:    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    plug:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M9 3v4m6-4v4M3 9h4m10 0h4"/></svg>,
    team:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    file:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    folder:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    message:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    shield:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    logout:   <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    revenue:  <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    bookmark: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
    bell:     <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0
