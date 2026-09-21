import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const serviceClient = createClient(url, serviceKey)

export async function requireUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await asUser.auth.getUser(token)
  if (error || !user) return null
  return user.id
}

export async function requireStaff(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await asUser.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await serviceClient
    .from('owner_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile) return null
  return user.id
}

// Resolves a verified staff/business id (from requireStaff/requireUser) to
// the actual business's user_id -- the id every business-scoped table
// (crm_*, whatsapp_*, call_logs, etc.) is keyed on. For the business's own
// direct login these are the same id. For a team member with their own
// separate login, team_members.email maps them to the business owner's
// user_id -- same lookup the RLS policies use client-side, mirrored here
// for server routes that need it before querying.
export async function resolveBusinessUserId(staffId: string, email: string | null | undefined): Promise<string> {
  if (email) {
    const { data: member } = await serviceClient
      .from('team_members')
      .select('user_id')
      .eq('email', email)
      .maybeSingle()
    if (member?.user_id) return member.user_id
  }
  return staffId
}

export async function requireStaffWithBusiness(req: NextRequest): Promise<{ staffId: string; email: string | null; businessId: string } | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await asUser.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await serviceClient
    .from('owner_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (profile) return null

  const businessId = await resolveBusinessUserId(user.id, user.email)
  return { staffId: user.id, email: user.email ?? null, businessId }
}
