import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/lib/mailbox'
import { serviceClient } from '@/lib/admin-auth'
import { screenCv } from '@/lib/cv-screen'

export const maxDuration = 60

// POST { id }: the AI reads the candidate's CV against the role and saves an opinion. Advice only.
export async function POST(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  const { data: app } = await serviceClient.from('job_applications').select('*').eq('id', String(id ?? '')).eq('user_id', c.businessId).maybeSingle()
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  const { data: role } = await serviceClient.from('job_roles').select('title,description').eq('business_id', c.businessId).eq('title', app.role_applied).maybeSingle()
  try {
    const patch = await screenCv(app, role ? { title: role.title, description: role.description } : null)
    await serviceClient.from('job_applications').update(patch).eq('id', app.id)
    return NextResponse.json({ ok: true, ...patch })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Could not review this CV' }, { status: 400 })
  }
}
