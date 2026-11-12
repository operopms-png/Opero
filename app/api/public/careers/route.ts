export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { alertEmail } from '@/lib/crm-lead'
import { sendEmail } from '@/lib/send-email'
import { SITE_URL } from '@/lib/brand'
import { randomUUID } from 'crypto'
import { cvLink } from '@/lib/cv-link'

// Public careers page. GET ?t=<token> → open roles. POST → saves the application in Applications
// (stage Applied) and the CRM (contact type applicant, no deal), and emails the team.
const clean = (v: any, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n)
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const CV_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }
const MODULE: Record<string, string> = { 'estate agency': 'estate', operations: 'pm', 'str & marketing': 'str' }
async function biz(token: string) {
  if (!/^[a-z0-9]{8,40}$/i.test(token)) return null
  const { data } = await db.from('enquiry_links').select('business_id,active').eq('token', token).maybeSingle()
  return data?.active ? (data.business_id as string) : null
}
export async function GET(req: NextRequest) {
  const b = await biz(req.nextUrl.searchParams.get('t') || ''); if (!b) return NextResponse.json({ ok: false }, { status: 404 })
  const { data } = await db.from('job_roles').select('id,title,category,location,job_type,description').eq('business_id', b).eq('active', true).order('created_at', { ascending: false })
  return NextResponse.json({ ok: true, roles: data ?? [] })
}
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null)
  if (!fd) return NextResponse.json({ error: 'Could not read the form.' }, { status: 400 })
  const b: Record<string, any> = Object.fromEntries(fd.entries())
  if (b.website) return NextResponse.json({ ok: true })
  const business = await biz(clean(b.token, 40)); if (!business) return NextResponse.json({ error: 'This page is no longer active.' }, { status: 404 })
  const { data: role } = await db.from('job_roles').select('title,category').eq('id', clean(b.role_id, 40)).eq('business_id', business).eq('active', true).maybeSingle()
  if (!role) return NextResponse.json({ error: 'Please choose a role.' }, { status: 400 })
  const name = clean(b.name, 120), email = clean(b.email, 200).toLowerCase(), phone = clean(b.phone, 40), message = clean(b.message, 3000)
  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please check your email address.' }, { status: 400 })
  const since = new Date(Date.now() - 600000).toISOString()
  const { data: dupe } = await db.from('job_applications').select('id').eq('user_id', business).eq('email', email).eq('role_applied', role.title).gte('created_at', since).limit(1)
  if (dupe?.length) return NextResponse.json({ ok: true })
  let cv = ''
  const file = fd.get('cv')
  if (file instanceof File && file.size) {
    const ext = CV_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Attach your CV as a PDF or Word file.' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Your CV is over 5 MB. Please attach a smaller file.' }, { status: 400 })
    const path = `${business}/${randomUUID()}.${ext}`
    const up = await db.storage.from('job-cvs').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (up.error) return NextResponse.json({ error: 'Could not upload your CV. Please try again.' }, { status: 500 })
    cv = cvLink(path)
  }
  const mod = MODULE[role.category.toLowerCase()] ?? ''
  const notes = ['Applied on the careers page', role.category ? `Category: ${role.category}` : null, message ? `Message: ${message}` : null].filter(Boolean).join('\n')
  const { error } = await db.from('job_applications').insert({ user_id: business, candidate_name: name, email, phone: phone || null, role_applied: role.title, module: mod, stage: 'Applied', notes, resume_url: cv || null })
  if (error) return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  await db.from('crm_contacts').insert({ user_id: business, name, email, phone: phone || null, type: 'applicant', source: 'Careers page', module: mod || 'pm', status: 'prospect', notes: `Applied for: ${role.title}${message ? `\nMessage: ${message}` : ''}${cv ? `\nCV: ${cv}` : ''}` })
  const to = await alertEmail(business)
  if (to) sendEmail(to, `New job application: ${name} for ${role.title}`.slice(0, 150), `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>Someone applied on your careers page.</p><p><b>${esc(role.title)}</b><br>${esc(name)} · ${esc(email)} · ${esc(phone || 'no phone')}</p>${message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : ''}${cv ? `<p><a href="${cv}">Open CV</a></p>` : '<p>No CV attached.</p>'}<p><a href="${SITE_URL}/staff-centre/applications">Open Applications</a></p></div>`, email).catch(() => {})
  sendEmail(email, `We have your application — ${role.title}`, `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#16233F"><p>Dear ${esc(name.split(' ')[0])},</p><p>Thank you for applying for <b>${esc(role.title)}</b>. We have your application and will be in touch if we would like to take it further.</p></div>`).catch(() => {})
  return NextResponse.json({ ok: true })
}
