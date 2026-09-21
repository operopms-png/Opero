import { NextRequest, NextResponse } from 'next/server'
import { serviceClient, requireStaffWithBusiness } from '@/lib/admin-auth'
import { voiceIdentityFor } from '@/lib/voice-identity'

export async function GET(req: NextRequest) {
  const auth = await requireStaffWithBusiness(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = req.nextUrl.searchParams.get('email')?.toLowerCase()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const { data: ownerAuth } = await serviceClient.auth.admin.getUserById(auth.businessId)
  const isOwner = ownerAuth?.user?.email?.toLowerCase() === email

  let targetName: string | null = null
  if (!isOwner) {
    const { data: member } = await serviceClient
      .from('team_members')
      .select('name,email,user_id')
      .eq('user_id', auth.businessId)
      .eq('email', email)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Not a member of your team' }, { status: 403 })
    targetName = member.name
  } else {
    targetName = ownerAuth?.user?.user_metadata?.name ?? email
  }

  const { data: userList } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
  const match = userList?.users?.find(u => u.email?.toLowerCase() === email)
  if (!match) return NextResponse.json({ error: 'That teammate has no login yet' }, { status: 404 })

  return NextResponse.json({ identity: voiceIdentityFor(match.id), name: targetName })
}
