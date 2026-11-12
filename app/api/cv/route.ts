export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { cvValid } from '@/lib/cv-link'
// Signed CV link → short-lived download.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('p') || '', s = req.nextUrl.searchParams.get('s') || ''
  if (!cvValid(p, s)) return NextResponse.json({ error: 'Invalid link' }, { status: 403 })
  const { data } = await db.storage.from('job-cvs').createSignedUrl(p, 120)
  if (!data?.signedUrl) return NextResponse.json({ error: 'File not found' }, { status: 404 })
  return NextResponse.redirect(data.signedUrl)
}
