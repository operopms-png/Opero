import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const serviceClient = createClient(url, serviceKey)

// Verifies the request's bearer token belongs to a real, logged-in user who
// has no owner_profiles row — i.e. staff/admin, same rule the client uses.
// Returns the staff user's id, or null if the request should be rejected.
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

  if (profile) return null // this user IS an owner, not staff
  return user.id
}
