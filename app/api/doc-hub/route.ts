export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/admin-auth'
import { getCaller } from '@/lib/mailbox'
import { DOC_SETS, DOC_SUBJECT_TABLE, LEASE_DOC_BUCKET } from '@/lib/lease-doc-types'
import { PORTAL_SUBJECTS, WHO, chasePerson, missingKeys, type PortalSubject } from '@/lib/doc-hub'

// The team's Documents hub (Staff Centre → Documents). Admins, Co Founders and property teams, scoped to their own company.
//   GET                                   → {review: files owners and tenants uploaded and nobody has approved yet, incomplete: people still owing documents}
//   POST {action:'chase', items:[{subject,id}]} → ask each person for what is missing (the first ask switches on the automatic reminders)
const bad = (e: string, s = 400) => NextResponse.json({ error: e }, { status: s })
const allowed = (c: any) => c.isAdmin || /co founder|property management|vacation rental|estate/i.test(c.role || '')

export async function GET(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const biz = c.businessId
  const { data: pend } = await db.from('lease_documents').select('*').eq('user_id', biz).eq('status', 'pending').in('subject', PORTAL_SUBJECTS).order('created_at', { ascending: true }).limit(100)
  const review = await Promise.all((pend ?? []).map(async (f: any) => {
    const sub = f.subject as PortalSubject
    const { data: p } = await db.from(DOC_SUBJECT_TABLE[sub]).select('name').eq('id', f.head_lease_id).maybeSingle()
    const { data: s } = await db.storage.from(LEASE_DOC_BUCKET).createSignedUrl(f.path, 300)
    return { id: f.id, subject: sub, who: WHO[sub], person: p?.name ?? 'Unknown', person_id: f.head_lease_id, category: DOC_SETS[sub].find(t => t.key === f.category)?.label ?? f.category, name: f.name, expires_on: f.expires_on, created_at: f.created_at, url: s?.signedUrl ?? null }
  }))
  const incomplete: any[] = []
  const { data: chases } = await db.from('doc_chases').select('subject, subject_id, sent_at').eq('user_id', biz).order('sent_at', { ascending: false }).limit(2000)
  const last = new Map<string, { at: string; n: number }>()
  for (const r of chases ?? []) { const k = r.subject + r.subject_id, e = last.get(k); if (!e) last.set(k, { at: r.sent_at, n: 1 }); else e.n++ }
  for (const sub of PORTAL_SUBJECTS) {
    const { data: people } = await db.from(DOC_SUBJECT_TABLE[sub]).select('id, name, email').eq('user_id', biz).limit(500)
    if (!people?.length) continue
    const { data: docs } = await db.from('lease_documents').select('head_lease_id, category, status').eq('user_id', biz).eq('subject', sub)
    const by = new Map<string, any[]>()
    for (const d of docs ?? []) (by.get(d.head_lease_id) ?? by.set(d.head_lease_id, []).get(d.head_lease_id)!).push(d)
    for (const p of people) {
      const miss = missingKeys(sub, by.get(p.id) ?? [])
      if (!miss.length) continue
      const l = last.get(sub + p.id)
      incomplete.push({ subject: sub, who: WHO[sub], id: p.id, name: p.name, email: p.email || '', missing: miss.length, missing_labels: miss.map(m => m.label), last_chased: l?.at ?? null, chases: l?.n ?? 0 })
    }
  }
  incomplete.sort((a, b) => b.missing - a.missing || String(a.name).localeCompare(String(b.name)))
  return NextResponse.json({ review, incomplete: incomplete.slice(0, 200) })
}

export async function POST(req: NextRequest) {
  const c = await getCaller(req); if (!c) return bad('Not signed in', 401); if (!allowed(c)) return bad('Not allowed.', 403)
  const b = await req.json().catch(() => ({}))
  if (b.action !== 'chase' || !Array.isArray(b.items)) return bad('Unknown action.')
  let sent = 0; const skipped: string[] = []
  for (const it of b.items.slice(0, 100)) {
    if (!(PORTAL_SUBJECTS as string[]).includes(it?.subject)) continue
    const r = await chasePerson(c.businessId, it.subject, String(it.id), 'request')
    if (r.ok) sent++; else skipped.push(r.reason || 'failed')
  }
  return NextResponse.json({ sent, skipped: skipped.length })
}
