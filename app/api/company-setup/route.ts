import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { hasScTab } from '@/lib/staff-access'
import { LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'

// Staff Centre → Company Setup: step-by-step plans (for example registering a US parent company)
// with documents stored on each step. Admins always; staff only when an admin ticks Company Setup.
//   GET                                   -> every plan with its steps and files (files carry a short-lived download link)
//   POST {action:'create-plan', title, summary?, template?:'us-parent'}
//   POST {action:'update-plan', id, title?, summary?, answers?}   |  {action:'delete-plan', id}
//   POST {action:'add-step', plan_id, title, details?}            |  {action:'update-step', id, ...fields}
//   POST {action:'delete-step', id}                               |  {action:'move-step', id, dir:'up'|'down'}
//   POST multipart {action:'upload', step_id, file}               |  {action:'delete-file', id}

const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const STATUSES = ['todo', 'doing', 'done']
const MAX_BYTES = 15 * 1024 * 1024

// Starting point only. Rules, fees and tax depend on the person and the state: check it with an adviser.
const TEMPLATES: Record<string, { title: string; summary: string; steps: { title: string; details: string }[] }> = {
  'us-parent': {
    title: 'Register NOVOURQ Group in the USA',
    summary: 'A starting plan for setting up a US parent company from the UK. Check the structure, tax and filings with a US/UK cross-border tax adviser before you file anything.',
    steps: [
      { title: 'Choose the company structure', details: 'Corporation (Delaware C Corporation) or LLC. Decide who owns it and what it will do, such as owning NOVOURQ Jamaica and future subsidiaries. Get adviser sign-off before you file.' },
      { title: 'Check the company name is available', details: 'Check that the name, for example NOVOURQ Group, Inc., is free in Delaware.' },
      { title: 'Choose a registered agent', details: 'A registered agent in the state is mandatory. They receive official legal letters for the company.' },
      { title: 'File the Certificate of Incorporation', details: 'Filed with the Delaware Division of Corporations. This creates the company.' },
      { title: 'Issue shares and record ownership', details: 'Set the share structure and who owns what. Keep the share records.' },
      { title: 'Apply for an EIN', details: 'The US tax number, free directly from the IRS. Non-US owners usually apply by fax or phone.' },
      { title: 'Open a US business bank account', details: 'Needs the incorporation documents, passport, proof of address and ownership details. Requirements vary by bank.' },
      { title: 'Set up accounting, tax and annual filings', details: 'Annual state franchise tax and filing fees, US tax filings and UK tax reporting. Appoint an accountant who handles both countries.' },
      { title: 'Keep separate business records', details: 'Keep company finances separate from personal ones and keep real business records.' },
    ],
  },
}

async function allowed(req: NextRequest) {
  const c = await getCaller(req)
  if (!c) return { err: bad('Not signed in', 401) }
  if (!(await hasScTab(c, 'companysetup'))) return { err: bad('You don’t have access to Company Setup. Ask an admin to tick it in Team Management.', 403) }
  return { c }
}

async function owned(table: string, id: string, biz: string) {
  const { data } = await db.from(table).select('*').eq('id', id).eq('user_id', biz).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const a = await allowed(req); if (a.err) return a.err
  const biz = a.c!.businessId
  const [{ data: plans }, { data: steps }, { data: files }] = await Promise.all([
    db.from('company_plans').select('*').eq('user_id', biz).order('created_at', { ascending: false }),
    db.from('company_plan_steps').select('*').eq('user_id', biz).order('position', { ascending: true }),
    db.from('company_plan_files').select('*').eq('user_id', biz).order('created_at', { ascending: true }),
  ])
  const withUrl = await Promise.all((files ?? []).map(async f => {
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 600)
    return { id: f.id, step_id: f.step_id, name: f.name, size: f.size, uploaded_by: f.uploaded_by, created_at: f.created_at, url: s?.signedUrl ?? null }
  }))
  return NextResponse.json({
    plans: (plans ?? []).map(p => ({ ...p, steps: (steps ?? []).filter(s => s.plan_id === p.id).map(s => ({ ...s, files: withUrl.filter(f => f.step_id === s.id) })) })),
  })
}

export async function POST(req: NextRequest) {
  const a = await allowed(req); if (a.err) return a.err
  const c = a.c!, biz = c.businessId

  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await req.formData()
    const step = await owned('company_plan_steps', String(form.get('step_id') ?? ''), biz)
    if (!step) return bad('Step not found', 404)
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) return bad('Choose a file to upload')
    if (file.size > MAX_BYTES) return bad('That file is over 15 MB. Send a smaller one.')
    const safe = (file.name || 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 120)
    const path = `company-setup/${biz}/${step.id}/${Date.now()}-${safe}`
    const up = await db.storage.from(LEASE_DOC_BUCKET).upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type || 'application/octet-stream', upsert: false })
    if (up.error) return bad('Could not store the file: ' + up.error.message, 500)
    const { error } = await db.from('company_plan_files').insert({ user_id: biz, plan_id: step.plan_id, step_id: step.id, name: file.name || 'Document', path, size: file.size, content_type: file.type || null, uploaded_by: c.name })
    if (error) { await db.storage.from(LEASE_DOC_BUCKET).remove([path]).catch(() => null); return bad(error.message, 500) }
    return NextResponse.json({ success: true })
  }

  const b = await req.json().catch(() => ({}))
  const action = b.action

  if (action === 'create-plan') {
    const t = b.template ? TEMPLATES[String(b.template)] : null
    const title = String(b.title ?? t?.title ?? '').trim().slice(0, 160)
    if (!title) return bad('Give the plan a title')
    const { data: plan, error } = await db.from('company_plans').insert({ user_id: biz, title, summary: String(b.summary ?? t?.summary ?? '').slice(0, 1000) || null, created_by: c.name }).select('*').single()
    if (error) return bad(error.message, 500)
    if (t) await db.from('company_plan_steps').insert(t.steps.map((s, i) => ({ user_id: biz, plan_id: plan.id, position: i + 1, title: s.title, details: s.details })))
    return NextResponse.json({ plan })
  }

  if (action === 'update-plan') {
    const p = await owned('company_plans', String(b.id ?? ''), biz); if (!p) return bad('Plan not found', 404)
    const patch: any = {}
    if (b.title !== undefined) { const t = String(b.title).trim().slice(0, 160); if (!t) return bad('Give the plan a title'); patch.title = t }
    if (b.summary !== undefined) patch.summary = String(b.summary).slice(0, 1000) || null
    if (b.answers !== undefined && typeof b.answers === 'object') patch.answers = b.answers
    const { error } = await db.from('company_plans').update(patch).eq('id', p.id)
    return error ? bad(error.message, 500) : NextResponse.json({ success: true })
  }

  if (action === 'delete-plan') {
    const p = await owned('company_plans', String(b.id ?? ''), biz); if (!p) return bad('Plan not found', 404)
    const { data: files } = await db.from('company_plan_files').select('path').eq('plan_id', p.id)
    if (files?.length) await db.storage.from(LEASE_DOC_BUCKET).remove(files.map(f => f.path)).catch(() => null)
    await db.from('company_plans').delete().eq('id', p.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'add-step') {
    const p = await owned('company_plans', String(b.plan_id ?? ''), biz); if (!p) return bad('Plan not found', 404)
    const title = String(b.title ?? '').trim().slice(0, 200); if (!title) return bad('Give the step a title')
    const { data: last } = await db.from('company_plan_steps').select('position').eq('plan_id', p.id).order('position', { ascending: false }).limit(1)
    const { error } = await db.from('company_plan_steps').insert({ user_id: biz, plan_id: p.id, position: (last?.[0]?.position ?? 0) + 1, title, details: String(b.details ?? '').slice(0, 2000) || null })
    return error ? bad(error.message, 500) : NextResponse.json({ success: true })
  }

  if (action === 'update-step') {
    const s = await owned('company_plan_steps', String(b.id ?? ''), biz); if (!s) return bad('Step not found', 404)
    const patch: any = {}
    if (b.title !== undefined) { const t = String(b.title).trim().slice(0, 200); if (!t) return bad('Give the step a title'); patch.title = t }
    if (b.details !== undefined) patch.details = String(b.details).slice(0, 2000) || null
    if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return bad('Unknown status'); patch.status = b.status }
    if (b.owner !== undefined) patch.owner = String(b.owner).slice(0, 120) || null
    if (b.due_date !== undefined) patch.due_date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due_date)) ? b.due_date : null
    if (b.cost !== undefined) patch.cost = String(b.cost).slice(0, 80) || null
    if (b.notes !== undefined) patch.notes = String(b.notes).slice(0, 4000) || null
    const { error } = await db.from('company_plan_steps').update(patch).eq('id', s.id)
    return error ? bad(error.message, 500) : NextResponse.json({ success: true })
  }

  if (action === 'delete-step') {
    const s = await owned('company_plan_steps', String(b.id ?? ''), biz); if (!s) return bad('Step not found', 404)
    const { data: files } = await db.from('company_plan_files').select('path').eq('step_id', s.id)
    if (files?.length) await db.storage.from(LEASE_DOC_BUCKET).remove(files.map(f => f.path)).catch(() => null)
    await db.from('company_plan_steps').delete().eq('id', s.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'move-step') {
    const s = await owned('company_plan_steps', String(b.id ?? ''), biz); if (!s) return bad('Step not found', 404)
    const { data: all } = await db.from('company_plan_steps').select('id,position').eq('plan_id', s.plan_id).order('position', { ascending: true })
    const ids = (all ?? []).map(x => x.id)
    const i = ids.indexOf(s.id), j = b.dir === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= ids.length) return NextResponse.json({ success: true })
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await Promise.all(ids.map((id, n) => db.from('company_plan_steps').update({ position: n + 1 }).eq('id', id)))
    return NextResponse.json({ success: true })
  }

  if (action === 'delete-file') {
    const f = await owned('company_plan_files', String(b.id ?? ''), biz); if (!f) return bad('File not found', 404)
    await db.storage.from(LEASE_DOC_BUCKET).remove([f.path]).catch(() => null)
    await db.from('company_plan_files').delete().eq('id', f.id)
    return NextResponse.json({ success: true })
  }

  return bad('Unknown action')
}
