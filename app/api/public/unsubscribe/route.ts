export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'

// Public. The unsubscribe link in every marketing email. GET shows a confirm button (so mail scanners that
// pre-open links don't unsubscribe people by accident); POST does it (also used by one-click List-Unsubscribe).
const page = (title: string, body: string) => new NextResponse(
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f6f8fc;font-family:Arial,sans-serif;color:#1A2C5E"><div style="max-width:440px;margin:12vh auto;background:#fff;border:1px solid #e4e9f4;border-radius:14px;padding:28px 24px;text-align:center"><h1 style="font-size:22px;margin:0 0 12px">${title}</h1>${body}</div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || ''
  if (!/^[a-z0-9]{8,40}$/i.test(t)) return page('Link not valid', '<p style="font-size:15px;line-height:1.6">This unsubscribe link is not valid. Reply to the email and we will remove you.</p>')
  return page('Unsubscribe', `<p style="font-size:15px;line-height:1.6;color:#3a4560">Stop receiving marketing emails from NOVOURQ?</p><form method="post" action="/api/public/unsubscribe?t=${encodeURIComponent(t)}"><button style="background:#1A2C5E;color:#fff;border:0;border-radius:10px;padding:14px 22px;font-size:15px;font-weight:700;cursor:pointer">Yes, unsubscribe me</button></form>`)
}

export async function POST(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || ''
  if (!/^[a-z0-9]{8,40}$/i.test(t)) return page('Link not valid', '<p>This unsubscribe link is not valid.</p>')
  await db.from('crm_contacts').update({ marketing_opt_in: false, marketing_unsub_at: new Date().toISOString() }).eq('unsub_token', t)
  return page('You are unsubscribed', '<p style="font-size:15px;line-height:1.6;color:#3a4560">You will not get any more marketing emails from us. You may still get messages about your account or an enquiry you made.</p>')
}
